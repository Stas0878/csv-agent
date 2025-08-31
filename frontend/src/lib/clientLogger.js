import { api } from "./api";

const buffer = [];
let timer = null;
let installed = false;

function flush() {
  if (!buffer.length) return;
  const entries = buffer.splice(0, buffer.length);
  api.post("/logs", { entries }).catch(() => {
    // On failure, put back for next attempt (cap size)
    try { buffer.unshift(...entries); } catch(_) {}
    buffer.splice(1000); // cap
  });
}

export function initClientLogger() {
  if (installed) return;
  installed = true;

  const push = (item) => {
    try {
      buffer.push({
        level: item.level || "error",
        message: String(item.message || "unknown"),
        stack: item.stack ? String(item.stack) : undefined,
        meta: item.meta || {},
        ts: Date.now(),
      });
      if (buffer.length > 200) buffer.splice(0, buffer.length - 200);
    } catch (_) {}
  };

  window.addEventListener("error", (e) => {
    push({ message: e.message, stack: e.error?.stack, level: "error" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    push({ message: e.reason?.message || "unhandledrejection", stack: e.reason?.stack, level: "error" });
  });

  // Optional: wrap console.error (non-fatal)
  const origErr = console.error;
  console.error = function (...args) {
    try { push({ level: "error", message: args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') }); } catch(_){}
    return origErr.apply(console, args);
  };

  timer = setInterval(flush, 10000);
  window.addEventListener("beforeunload", flush);
}