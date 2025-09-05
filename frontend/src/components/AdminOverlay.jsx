import React, { useState } from "react";
import { Button } from "./ui/button";
import { validateUIState, validateAction } from "../core/validation/ValidationEngine";
import { toast } from "../hooks/use-toast";
import BackButton from "./BackButton";

export default function AdminOverlay({ onClose, config, setConfig }) {
  const [status, setStatus] = useState({ color: 'green', errors: [] });

  const getPanelsPayload = () => {
    try {
      const ids = [
        { id: 'left', sel: '[data-testid="drag-left"]' },
        { id: 'right', sel: '[data-testid="drag-right"]' },
        { id: 'input', sel: '[data-testid="drag-input"]' },
      ];
      const rects = ids.map(({ id, sel }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      }).filter(Boolean);
      const topbar = document.querySelector('[data-testid="topbar"]');
      const critical = [];
      if (topbar) {
        const r = topbar.getBoundingClientRect();
        critical.push({ id: 'topbar', x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
      }
      const container = { w: window.innerWidth, h: window.innerHeight };
      return { container, rects, critical };
    } catch (_) { return undefined; }
  };

  const blockWith = (errors) => {
    setStatus({ color: 'red', errors: errors || [] });
    toast({ title: 'Validation error', description: (errors || []).join('\n') });
  };

  const apply = (type, next) => {
    const panelsPayload = getPanelsPayload();
    const res = validateUIState(next, panelsPayload);
    if (!res.valid) return blockWith(res.errors || []);
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };

  const toggleSwap = () => apply('layout/swap', { ...config, layout: { ...config.layout, swapSidebars: !config.layout.swapSidebars } });
  const toggleLeft = () => apply('layout/leftCollapsed', { ...config, layout: { ...config.layout, leftCollapsed: !config.layout.leftCollapsed } });
  const toggleRight = () => apply('layout/rightCollapsed', { ...config, layout: { ...config.layout, rightCollapsed: !config.layout.rightCollapsed } });
  const setComposer = (pos) => apply('layout/composer', { ...config, layout: { ...config.layout, composerPosition: pos } });

  const tabs = config.tabs || { order: ["terminal","admin","history"], enabled: { terminal: true, admin: true, history: true } };
  const moveTab = (fromIdx, toIdx) => {
    const order = [...tabs.order];
    const [item] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, item);
    const next = { ...config, tabs: { ...tabs, order } };
    const res = validateAction({ type: 'tabs/update', payload: { order, enabled: tabs.enabled } });
    if (!res.valid) return blockWith(res.errors || []);
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };
  const toggleTab = (key) => {
    const enabled = { ...tabs.enabled, [key]: !(tabs.enabled[key] !== false) };
    const next = { ...config, tabs: { ...tabs, enabled } };
    const res = validateAction({ type: 'tabs/update', payload: { order: tabs.order, enabled } });
    if (!res.valid) return blockWith(res.errors || []);
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };

  const features = config.features || { voice: true, dragdrop: true, counter: true };
  const toggleFeature = (k) => {
    const next = { ...config, features: { ...features, [k]: !features[k] } };
    const res = validateAction({ type: 'features/toggle', payload: next.features });
    if (!res.valid) return blockWith(res.errors || []);
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };

  const setPreviewMode = (mode) => {
    const next = { ...config, preview: { ...config.preview, mode } };
    const res = validateAction({ type: 'preview/set', payload: { mode } });
    if (!res.valid) return blockWith(res.errors || []);
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };

  const toggleSafeMode = () => {
    const next = { ...config, safeMode: !config.safeMode };
    const res = validateUIState(next);
    if (!res.valid) return blockWith(res.errors || []);
    try {
      const root = document.documentElement;
      const body = document.body;
      if (next.safeMode) { root.classList.add('safe-mode'); body.classList.add('safe-mode'); }
      else { root.classList.remove('safe-mode'); body.classList.remove('safe-mode'); }
    } catch(_){}
    setStatus({ color: 'green', errors: [] });
    setConfig(next);
  };

  const exportConfig = () => {
    try {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uiConfig.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast({ title: 'Export error', description: String(e) }); }
  };

  const importConfig = async (file) => {
    try {
      const text = await file.text();
      const next = JSON.parse(text);
      const res = validateUIState(next);
      if (!res.valid) return blockWith(res.errors || []);
      setConfig(next);
      setStatus({ color: 'green', errors: [] });
      toast({ title: 'Импорт конфигурации', description: 'Готово' });
    } catch (e) { blockWith([String(e)]); }
  };

  const resetConfig = () => {
    const defaults = window.MMX_DEFAULT_CONFIG || window.__MMX_DEFAULT_CONFIG__;
    if (!defaults) return blockWith(['Default config not available']);
    const res = validateUIState(defaults);
    if (!res.valid) return blockWith(res.errors || []);
    setConfig(defaults);
    setStatus({ color: 'green', errors: [] });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-xl w-[880px] max-w-[96vw] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <BackButton
              onBack={onClose}
              canGoBack={true}
              showText={true}
              text="Закрыть"
              variant="ghost"
              size="sm"
            />
            <div className="text-sm font-medium flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.color === 'green' ? 'bg-emerald-500' : status.color === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
              <span>Admin Settings</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={config.safeMode ? 'secondary' : 'outline'} onClick={toggleSafeMode}>Safe Mode</Button>
            <Button size="sm" variant="outline" onClick={exportConfig}>Export</Button>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input type="file" accept="application/json" onChange={(e)=>{ const f=e.target.files&&e.target.files[0]; if (f) importConfig(f); }} />
              Import
            </label>
            <Button size="sm" variant="destructive" onClick={resetConfig}>Reset</Button>
            <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>

        {status.errors?.length ? (
          <div className="mb-3 p-2 text-sm bg-rose-500/10 border border-rose-500/30 rounded text-rose-400">
            {status.errors.map((e, i) => (<div key={i}>• {e}</div>))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="font-medium">Layout</div>
            <label className="flex items-center justify-between"><span>Swap sidebars</span><input type="checkbox" checked={config.layout.swapSidebars} onChange={toggleSwap} /></label>
            <label className="flex items-center justify-between"><span>Left collapsed</span><input type="checkbox" checked={config.layout.leftCollapsed} onChange={toggleLeft} /></label>
            <label className="flex items-center justify-between"><span>Right collapsed</span><input type="checkbox" checked={config.layout.rightCollapsed} onChange={toggleRight} /></label>
            <div>
              <div className="mb-1">Composer position</div>
              <div className="flex gap-2">
                <Button size="sm" variant={config.layout.composerPosition==='above'?'secondary':'outline'} onClick={()=> setComposer('above')}>Above</Button>
                <Button size="sm" variant={config.layout.composerPosition==='below'?'secondary':'outline'} onClick={()=> setComposer('below')}>Below</Button>
              </div>
            </div>

            <div className="font-medium mt-3 mb-1">Features</div>
            <label className="flex items-center justify-between"><span>Voice input</span><input type="checkbox" checked={features.voice} onChange={()=> toggleFeature('voice')} /></label>
            <label className="flex items-center justify-between"><span>Drag & Drop</span><input type="checkbox" checked={features.dragdrop} onChange={()=> toggleFeature('dragdrop')} /></label>
            <label className="flex items-center justify-between"><span>Counter</span><input type="checkbox" checked={features.counter} onChange={()=> toggleFeature('counter')} /></label>
          </div>

          <div className="space-y-3">
            <div className="font-medium">Preview</div>
            <div className="flex gap-2">
              <Button size="sm" variant={config.preview.mode==='embedded'?'secondary':'outline'} onClick={()=> setPreviewMode('embedded')}>Embedded</Button>
              <Button size="sm" variant={config.preview.mode==='fullscreen'?'secondary':'outline'} onClick={()=> setPreviewMode('fullscreen')}>Fullscreen</Button>
            </div>

            <div className="font-medium mt-4">Tabs</div>
            <div className="flex items-center gap-3 flex-wrap">
              {tabs.order.map((k, idx) => (
                <div key={k} className="border rounded px-2 py-1 flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={tabs.enabled[k] !== false} onChange={()=> toggleTab(k)} />
                    <span className="capitalize">{k}</span>
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={idx===0} onClick={()=> moveTab(idx, idx-1)}>↑</Button>
                    <Button size="sm" variant="outline" disabled={idx===tabs.order.length-1} onClick={()=> moveTab(idx, idx+1)}>↓</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}