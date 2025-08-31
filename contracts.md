# MegaMind_X API Contracts (v0.1)

Scope
- Replace frontend mocks with real backend
- FastAPI + MongoDB
- SSE stream for terminal
- Streamlit fallback package later (TinyDB/SQLite)

Collections (Mongo)
1) agents
   - id: string (e.g., "agent-01")
   - name: string
   - status: enum[online|broken|idle]
   - enabled: bool
   - updatedAt: datetime (UTC)

2) outputs
   - id: string (uuid)
   - sessionId: string (required)
   - agentId: string (required)
   - content: string
   - createdAt: datetime (UTC)

3) history
   - id: string (uuid)
   - agentId: string
   - content: string
   - createdAt: datetime (UTC)

4) presets (optional, future)
   - id: string (uuid)
   - name: string
   - content: string
   - createdAt: datetime (UTC)

API Endpoints (All prefixed with /api)
- GET /api/              -> {message}

Agents
- GET /api/agents        -> [Agent]
- POST /api/agents/init  -> {created: number}  // seed 25 if empty (idempotent)
- PATCH /api/agents/{id} -> body {enabled?: bool, status?: enum} -> Agent
- POST /api/agents/refresh -> server randomizes status for all agents -> {ok: true}

Terminal Output
- POST /api/output/append -> body {sessionId, agentId, content} -> Output
- GET  /api/stream        -> SSE. Query: sessionId. Emits: {type: "output", data: Output}
- WS   /api/ws/{sessionId} (optional) -> Sends same payload as SSE

History
- GET  /api/history?limit=100 -> [History] (desc by createdAt)
- POST /api/history -> body {agentId, content} -> History

SSE Payload Example
- event: message
- data: {"type":"output","data":{"id":"...","sessionId":"...","agentId":"agent-01","content":"...","createdAt":"2025-08-31T15:00:00Z"}}

Frontend <> Backend Integration Plan
1) Replace mock.js usages:
   - Agents: load via GET /api/agents, refresh via POST /api/agents/refresh, toggle via PATCH /api/agents/:id
   - Terminal: Append via POST /api/output/append, Auto mode: client posts mock chunks periodically OR real backend pushes; UI consumes via SSE GET /api/stream?sessionId
   - History: Save via POST /api/history, Fetch via GET /api/history
2) Keep localStorage only for theme/lang/panels/selectedAgent/sessionId.
3) Use REACT_APP_BACKEND_URL from frontend/.env; never hardcode URLs.

Mock replacements to remove in frontend
- generateAgents(), randomizeStatuses(), local history array.

Backend TODO
- Implement models and routes above.
- In-memory broadcaster per session (asyncio.Queue set) for SSE; broadcast on append.
- Ensure CORS and /api prefix.

Testing
- Run deep_testing_backend_v2 after backend implementation.
- Then integrate frontend and re-test.