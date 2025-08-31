from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timedelta
import asyncio
from starlette.responses import StreamingResponse
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
# DB name must exist in env. Keep as-is per environment; fallback to 'appdb' in dev
_db_name = os.environ.get('DB_NAME', 'appdb')
db = client[_db_name]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------------------------
# Models
# ---------------------------------------
class Agent(BaseModel):
  id: str
  name: str
  status: str = Field(pattern=r"^(online|broken|idle)$")
  enabled: bool = True
  ai: bool = False
  updatedAt: datetime = Field(default_factory=datetime.utcnow)

class AgentUpdate(BaseModel):
  enabled: Optional[bool] = None
  status: Optional[str] = Field(default=None, pattern=r"^(online|broken|idle)$")

class Output(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  sessionId: str
  agentId: str
  content: str
  createdAt: datetime = Field(default_factory=datetime.utcnow)

class OutputCreate(BaseModel):
  sessionId: str
  agentId: str
  content: str

class History(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  agentId: Optional[str] = None
  content: str
  createdAt: datetime = Field(default_factory=datetime.utcnow)

class HistoryCreate(BaseModel):
  agentId: Optional[str] = None
  content: str

# ---------------------------------------
# Utilities / Seed
# ---------------------------------------
STATUSES = ["online", "broken", "idle"]

async def ensure_agents_seed():
  count = await db.agents.count_documents({})
  if count == 0:
    docs = []
    for i in range(25):
      ag_id = f"agent-{str(i+1).zfill(2)}"
      docs.append({
        "id": ag_id,
        "name": f"Agent-{str(i+1).zfill(2)}",
        "status": STATUSES[i % len(STATUSES)],
        "enabled": True,
        "ai": i < 4,  # первые 4 — AI
        "updatedAt": datetime.utcnow(),
      })
    if docs:
      await db.agents.insert_many(docs)

@app.on_event("startup")
async def on_startup():
  await ensure_agents_seed()

# ---------------------------------------
# Broadcaster for SSE / WS
# ---------------------------------------
class SessionHub:
  def __init__(self):
    self.sse_subs: Dict[str, Set[asyncio.Queue]] = {}
    self.ws_subs: Dict[str, Set[WebSocket]] = {}
    self.lock = asyncio.Lock()

  async def publish(self, session_id: str, payload: dict):
    # SSE
    queues = list(self.sse_subs.get(session_id, set()))
    for q in queues:
      try:
        q.put_nowait(payload)
      except Exception:
        pass
    # WS
    conns = list(self.ws_subs.get(session_id, set()))
    for ws in conns:
      try:
        await ws.send_text(json.dumps(payload))
      except Exception:
        pass

  async def subscribe_sse(self, session_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    async with self.lock:
      self.sse_subs.setdefault(session_id, set()).add(q)
    return q

  async def unsubscribe_sse(self, session_id: str, q: asyncio.Queue):
    async with self.lock:
      if session_id in self.sse_subs:
        self.sse_subs[session_id].discard(q)
        if not self.sse_subs[session_id]:
          del self.sse_subs[session_id]

  async def register_ws(self, session_id: str, ws: WebSocket):
    async with self.lock:
      self.ws_subs.setdefault(session_id, set()).add(ws)

  async def unregister_ws(self, session_id: str, ws: WebSocket):
    async with self.lock:
      if session_id in self.ws_subs:
        self.ws_subs[session_id].discard(ws)
        if not self.ws_subs[session_id]:
          del self.ws_subs[session_id]

hub = SessionHub()

# ---------------------------------------
# Routes
# ---------------------------------------
@api_router.get("/")
async def root():
  return {"message": "Hello World"}

# Agents
@api_router.get("/agents", response_model=List[Agent])
async def get_agents():
  await ensure_agents_seed()
  docs = await db.agents.find().sort("id", 1).to_list(100)
  return [Agent(**d) for d in docs]

@api_router.post("/agents/init")
async def init_agents():
  await ensure_agents_seed()
  count = await db.agents.count_documents({})
  return {"count": count}

@api_router.patch("/agents/{agent_id}", response_model=Agent)
async def patch_agent(agent_id: str, body: AgentUpdate):
  update = {k: v for k, v in body.dict().items() if v is not None}
  update["updatedAt"] = datetime.utcnow()
  res = await db.agents.find_one_and_update({"id": agent_id}, {"$set": update}, return_document=True)
  if not res:
    raise HTTPException(status_code=404, detail="Agent not found")
  return Agent(**res)

@api_router.post("/agents/refresh")
async def refresh_agents():
  # Randomize statuses for demo purposes
  agents = await db.agents.find().to_list(100)
  for ag in agents:
    ag["status"] = STATUSES[uuid.uuid4().int % len(STATUSES)]
    ag["updatedAt"] = datetime.utcnow()
    await db.agents.update_one({"id": ag["id"]}, {"$set": {"status": ag["status"], "updatedAt": ag["updatedAt"]}})
  return {"ok": True}

# Metrics
@api_router.get("/metrics")
async def metrics():
  total = await db.agents.count_documents({})
  pipeline = [
    {"$group": {"_id": "$status", "count": {"$sum": 1}}}
  ]
  by_status = {"online": 0, "broken": 0, "idle": 0}
  async for row in db.agents.aggregate(pipeline):
    by_status[row["_id"]] = row["count"]
  enabled = await db.agents.count_documents({"enabled": True})
  since = datetime.utcnow() - timedelta(hours=24)
  outputs24 = await db.outputs.count_documents({"createdAt": {"$gte": since}})
  return {"agents": total, "enabled": enabled, "status": by_status, "outputs24h": outputs24}

# Output Append + Stream
@api_router.post("/output/append", response_model=Output)
async def append_output(body: OutputCreate):
  out = Output(**body.dict())
  await db.outputs.insert_one(out.dict())
  # Convert datetime to ISO string for JSON serialization
  out_dict = out.dict()
  out_dict["createdAt"] = out_dict["createdAt"].isoformat()
  payload = {"type": "output", "data": out_dict}
  await hub.publish(out.sessionId, payload)
  return out

@api_router.get("/stream")
async def stream(sessionId: str):
  # Server-Sent Events stream
  async def event_gen():
    q = await hub.subscribe_sse(sessionId)
    try:
      while True:
        payload = await q.get()
        yield f"data: {json.dumps(payload)}\n\n"
    except asyncio.CancelledError:
      pass
    finally:
      await hub.unsubscribe_sse(sessionId, q)

  return StreamingResponse(event_gen(), media_type="text/event-stream")

# WebSocket (optional)
@api_router.websocket("/ws/{session_id}")
async def ws_endpoint(websocket: WebSocket, session_id: str):
  await websocket.accept()
  await hub.register_ws(session_id, websocket)
  try:
    while True:
      # Echo ping/pong or ignore messages from client
      _ = await websocket.receive_text()
  except WebSocketDisconnect:
    pass
  finally:
    await hub.unregister_ws(session_id, websocket)

# History
@api_router.get("/history", response_model=List[History])
async def get_history(limit: int = 100):
  docs = await db.history.find().sort("createdAt", -1).limit(min(limit, 200)).to_list(1000)
  return [History(**d) for d in docs]

@api_router.post("/history", response_model=History)
async def create_history(body: HistoryCreate):
  h = History(**body.dict())
  await db.history.insert_one(h.dict())
  return h

# Legacy sample endpoints kept
class StatusCheck(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  client_name: str
  timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
  client_name: str

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
  status_obj = StatusCheck(**input.dict())
  _ = await db.status_checks.insert_one(status_obj.dict())
  return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
  status_checks = await db.status_checks.find().to_list(1000)
  return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
  CORSMiddleware,
  allow_credentials=True,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
  level=logging.INFO,
  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
  client.close()