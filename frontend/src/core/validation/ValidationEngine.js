/* ValidationEngine (JS): prevents invalid UI changes and logs violations. */

const SYSTEM_TABS = ['terminal', 'admin', 'history'];

function logViolation(type, reasons) {
  try {
    const key = 'validation_log';
    const entry = { time: new Date().toISOString(), type, reasons };
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    localStorage.setItem(key, JSON.stringify(arr.slice(-500)));
    fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'validation', entries: [entry] }) }).catch(()=>{});
  } catch (_) {}
}

function unique(arr) { return Array.from(new Set(arr)); }

function validateTabs(cfg, out) {
  const order = (cfg && cfg.tabs && cfg.tabs.order) || [];
  const enabled = (cfg && cfg.tabs && cfg.tabs.enabled) || {};
  if (!order.length) out.errors.push('At least one tab must exist.');
  const uniq = unique(order);
  if (uniq.length !== order.length) out.errors.push('Tabs order has duplicates.');
  SYSTEM_TABS.forEach(key => { if (!order.includes(key)) out.errors.push(`System tab missing: ${key}`); });
  const anyEnabled = order.some(k => enabled[k] !== false);
  if (!anyEnabled) out.errors.push('At least one tab must be enabled.');
}

function rectWithin(r, c) { return r.x >= 0 && r.y >= 0 && r.x + r.w <= c.w && r.y + r.h <= c.h; }
function overlaps(a, b) {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap; // area
}
function fullyOverlaps(a, b) {
  const inside = (ax, ay) => (ax >= b.x && ax <= b.x + b.w && ay >= b.y && ay <= b.y + b.h);
  return inside(a.x, a.y) && inside(a.x + a.w, a.y) && inside(a.x, a.y + a.h) && inside(a.x + a.w, a.y + a.h);
}

function validatePanels(payload, out) {
  if (!payload || !payload.container || !payload.rects) return;
  const { container, rects } = payload;
  rects.forEach(r => { if (!rectWithin(r, container)) out.errors.push(`Panel ${r.id} exceeds container bounds.`); });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (fullyOverlaps(rects[i], rects[j]) || fullyOverlaps(rects[j], rects[i])) out.errors.push(`Panels ${rects[i].id} and ${rects[j].id} fully overlap.`);
    }
  }
  // Critical zones (e.g., topbar, system buttons)
  const critical = payload.critical || [];
  const THRESHOLD = 400; // min overlap area to consider blocking
  rects.forEach(r => {
    critical.forEach(cz => {
      if (overlaps(r, cz) > THRESHOLD) out.errors.push(`Panel ${r.id} overlaps critical zone: ${cz.id}`);
    });
  });
}

function validateFeatures(cfg, out) {
  if (!cfg.features) out.errors.push('Features config missing.');
  ['voice','dragdrop','counter'].forEach(k => { if ((cfg.features || {})[k] === undefined) out.errors.push(`Feature flag missing: ${k}`); });
}

function validatePreview(cfg, out) {
  if (!cfg.preview) out.errors.push('Preview settings missing.');
  const mode = cfg.preview && cfg.preview.mode;
  if (mode !== 'embedded' && mode !== 'fullscreen') out.errors.push('Invalid preview mode.');
}

export function validateUIState(uiConfig, panelsPayload) {
  const res = { valid: true, errors: [], warnings: [] };
  try {
    validateTabs(uiConfig, res);
    validateFeatures(uiConfig, res);
    validatePreview(uiConfig, res);
    if (panelsPayload) validatePanels(panelsPayload, res);
  } catch (e) {
    res.valid = false;
    res.errors.push('Unexpected validation error: ' + String(e && e.message || e));
  }
  if (res.errors.length) res.valid = false;
  return res;
}

export function validateAction(action) {
  const res = { valid: true, errors: [], warnings: [] };
  try {
    switch (action.type) {
      case 'tabs/update': {
        const fakeCfg = {
          layout: { swapSidebars: false, leftCollapsed: false, rightCollapsed: false, composerPosition: 'above' },
          preview: { mode: 'embedded', placement: 'center' },
          effects: { glowMode: 'soft', parallax: false, parallaxIntensity: 30, accentHue: 190 },
          features: { voice: true, dragdrop: true, counter: true },
          tabs: { order: (action.payload && action.payload.order) || [], enabled: (action.payload && action.payload.enabled) || {} },
          custom: { buttons: [] },
        };
        validateTabs(fakeCfg, res);
        break;
      }
      case 'panels/move': {
        validatePanels(action.payload, res);
        break;
      }
      case 'features/toggle': {
        const features = action.payload || {};
        ['voice','dragdrop','counter'].forEach(k => { if (features[k] === undefined) res.errors.push(`Feature flag missing in payload: ${k}`); });
        break;
      }
      case 'preview/set': {
        const mode = action.payload && action.payload.mode;
        if (mode !== 'embedded' && mode !== 'fullscreen') res.errors.push('Invalid preview mode.');
        break;
      }
      default:
        break;
    }
  } catch (e) {
    res.valid = false;
    res.errors.push('Unexpected validation error: ' + String(e && e.message || e));
  }
  if (res.errors.length) res.valid = false;
  if (!res.valid) logViolation(action.type || 'unknown', res.errors);
  return res;
}