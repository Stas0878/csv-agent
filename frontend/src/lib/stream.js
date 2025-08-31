/*
  Reliable streaming connector for SSE with WS fallback and backoff.
  Usage:
    const conn = connectStream({ sessionId, onMessage, onStatusChange });
    return () => conn.close();
*/
export function connectStream({ sessionId, onMessage, onStatusChange }) {
  const BASE = process.env.REACT_APP_BACKEND_URL;
  let es = null;
  let ws = null;
  let closed = false;
  let attempt = 0;
  let timer = null;

  const setStatus = (s) => { try { onStatusChange && onStatusChange(s); } catch(_){} };

  const handleMessage = (data) => {
    try { onMessage && onMessage(data); } catch(_) {}
  };

  const wsUrl = () => {
    const base = BASE || window.location.origin;
    const proto = base.startsWith("https") ? "wss" : "ws";
    const u = new URL(base);
    return `${proto}://${u.host}/api/ws/${sessionId}`;
  };

  const esUrl = () => `${BASE}/api/stream?sessionId=${encodeURIComponent(sessionId)}`;

  const cleanup = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (es) { try { es.close(); } catch(_){} es = null; }
    if (ws) { try { ws.close(); } catch(_){} ws = null; }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    attempt += 1;
    const delay = Math.min(15000, 1000 * Math.pow(1.8, attempt)); // 1s -> 15s
    setStatus("reconnecting");
    timer = setTimeout(() => {
      startES();
    }, delay);
  };

  const startWS = () => {
    if (closed) return;
    try {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => setStatus("live");
      ws.onmessage = (ev) => {
        try { const payload = JSON.parse(ev.data); handleMessage(payload); } catch(_){}
      };
      ws.onerror = () => { setStatus("offline"); try { ws.close(); } catch(_){} scheduleReconnect(); };
      ws.onclose = () => { if (!closed) scheduleReconnect(); };
    } catch (e) {
      scheduleReconnect();
    }
  };

  const startES = () => {
    if (closed) return;
    setStatus("connecting");
    try {
      es = new EventSource(esUrl());
      es.onopen = () => { attempt = 0; setStatus("live"); };
      es.onmessage = (ev) => {
        try { const payload = JSON.parse(ev.data); handleMessage(payload); } catch(_){}
      };
      es.onerror = () => { try { es.close(); } catch(_){}; startWS(); };
    } catch (e) {
      startWS();
    }
  };

  startES();

  if (typeof window !== 'undefined') {
    window.__mmxDebugBreak = () => { if (closed) return; try { cleanup(); } catch(_){}; scheduleReconnect(); };
  }

  return {
    close() { closed = true; cleanup(); },
  };
}