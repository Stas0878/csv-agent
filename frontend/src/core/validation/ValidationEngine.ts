/* ValidationEngine: prevents invalid UI changes and logs violations.
   Lightweight, no external deps. Safe to import from JS files.
*/

export interface ValidationAction {
  type: string;
  payload: any;
}

export interface UIConfig {
  layout: {
    swapSidebars: boolean;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    composerPosition: 'above' | 'below';
  };
  preview: { mode: 'embedded' | 'fullscreen'; placement: 'center' | 'right' };
  effects: { glowMode: 'soft' | 'medium' | 'strong'; parallax: boolean; parallaxIntensity: number; accentHue: number };
  features: { voice: boolean; dragdrop: boolean; counter: boolean };
  tabs: { order: string[]; enabled: Record<string, boolean> };
  custom?: { buttons?: { id: string; label: string }[] };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

const SYSTEM_TABS = ['terminal', 'admin', 'history'];

function logViolation(type: string, reasons: string[]) {
  try {
    const key = 'validation_log';
    const entry = { time: new Date().toISOString(), type, reasons };
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    localStorage.setItem(key, JSON.stringify(arr.slice(-500)));
    // Optionally: send to backend logs endpoint (best-effort)
    fetch((window as any).REACT_APP_BACKEND_URL ? (window as any).REACT_APP_BACKEND_URL + '/logs' : '/api/logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'validation', entries: [entry] })
    }).catch(()=>{});
  } catch (_) {}
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

function validateTabs(cfg: UIConfig, out: ValidationResult) {
  const order = cfg.tabs?.order || [];
  const enabled = cfg.tabs?.enabled || {};
  if (!order.length) out.errors!.push('At least one tab must exist.');
  const uniq = unique(order);
  if (uniq.length !== order.length) out.errors!.push('Tabs order has duplicates.');
  // system tabs must be present in order
  for (const key of SYSTEM_TABS) {
    if (!order.includes(key)) out.errors!.push(`System tab missing: ${key}`);
  }
  // at least one enabled
  const anyEnabled = order.some(k => enabled[k] !== false);
  if (!anyEnabled) out.errors!.push('At least one tab must be enabled.');
}

export interface PanelRect { id: string; x: number; y: number; w: number; h: number }
export interface PanelsPayload { container: { w: number; h: number }; rects: PanelRect[] }

function rectWithin(r: PanelRect, c: { w: number; h: number }): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= c.w && r.y + r.h <= c.h;
}

function fullyOverlaps(a: PanelRect, b: PanelRect): boolean {
  const inside = (ax: number, ay: number) => (ax >= b.x && ax <= b.x + b.w && ay >= b.y && ay <= b.y + b.h);
  // all four corners of a inside b
  return inside(a.x, a.y) && inside(a.x + a.w, a.y) && inside(a.x, a.y + a.h) && inside(a.x + a.w, a.y + a.h);
}

function validatePanels(payload: PanelsPayload, out: ValidationResult) {
  if (!payload || !payload.container || !payload.rects) return;
  const { container, rects } = payload;
  rects.forEach(r => { if (!rectWithin(r, container)) out.errors!.push(`Panel ${r.id} exceeds container bounds.`); });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (fullyOverlaps(rects[i], rects[j]) || fullyOverlaps(rects[j], rects[i])) {
        out.errors!.push(`Panels ${rects[i].id} and ${rects[j].id} fully overlap.`);
      }
    }
  }
}

function validateFeatures(cfg: UIConfig, out: ValidationResult) {
  if (!cfg.features) out.errors!.push('Features config missing.');
  // InputComposer safety: presence of flags is enough here
  ['voice','dragdrop','counter'].forEach(k => { if ((cfg.features as any)[k] === undefined) out.errors!.push(`Feature flag missing: ${k}`); });
}

function validatePreview(cfg: UIConfig, out: ValidationResult) {
  if (!cfg.preview) out.errors!.push('Preview settings missing.');
  const mode = cfg.preview?.mode;
  if (mode !== 'embedded' && mode !== 'fullscreen') out.errors!.push('Invalid preview mode.');
}

export function validateUIState(uiConfig: UIConfig, panelsPayload?: PanelsPayload): ValidationResult {
  const res: ValidationResult = { valid: true, errors: [], warnings: [] };
  try {
    validateTabs(uiConfig, res);
    validateFeatures(uiConfig, res);
    validatePreview(uiConfig, res);
    if (panelsPayload) validatePanels(panelsPayload, res);
  } catch (e: any) {
    res.valid = false;
    res.errors!.push('Unexpected validation error: ' + String(e?.message || e));
  }
  if (res.errors && res.errors.length) {
    res.valid = false;
  }
  return res;
}

export function validateAction(action: ValidationAction): ValidationResult {
  const res: ValidationResult = { valid: true, errors: [], warnings: [] };
  try {
    switch (action.type) {
      case 'tabs/update': {
        // payload: { order: string[], enabled: Record<string, boolean> }
        const fakeCfg: UIConfig = {
          layout: { swapSidebars: false, leftCollapsed: false, rightCollapsed: false, composerPosition: 'above' },
          preview: { mode: 'embedded', placement: 'center' },
          effects: { glowMode: 'soft', parallax: false, parallaxIntensity: 30, accentHue: 190 },
          features: { voice: true, dragdrop: true, counter: true },
          tabs: { order: action.payload?.order || [], enabled: action.payload?.enabled || {} },
          custom: { buttons: [] },
        };
        validateTabs(fakeCfg, res);
        break;
      }
      case 'panels/move': {
        // payload: PanelsPayload
        validatePanels(action.payload as PanelsPayload, res);
        break;
      }
      case 'features/toggle': {
        // payload: UIConfig['features']
        const features = action.payload || {};
        ['voice','dragdrop','counter'].forEach(k => { if (features[k] === undefined) res.errors!.push(`Feature flag missing in payload: ${k}`); });
        break;
      }
      case 'preview/set': {
        const mode = action.payload?.mode;
        if (mode !== 'embedded' && mode !== 'fullscreen') res.errors!.push('Invalid preview mode.');
        break;
      }
      default:
        // no-op
        break;
    }
  } catch (e: any) {
    res.valid = false;
    res.errors!.push('Unexpected validation error: ' + String(e?.message || e));
  }
  if (res.errors && res.errors.length) res.valid = false;
  if (!res.valid) logViolation(action.type, res.errors!);
  return res;
}