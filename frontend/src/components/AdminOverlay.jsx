import React from "react";
import { Button } from "./ui/button";

export default function AdminOverlay({ onClose, config, setConfig }) {
  const toggleSwap = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, swapSidebars: !prev.layout.swapSidebars } }));
  const toggleLeft = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, leftCollapsed: !prev.layout.leftCollapsed } }));
  const toggleRight = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, rightCollapsed: !prev.layout.rightCollapsed } }));
  const setComposer = (pos) => setConfig(prev => ({ ...prev, layout: { ...prev.layout, composerPosition: pos } }));

  const tabs = config.tabs || { order: ["terminal","admin","history"], enabled: { terminal: true, admin: true, history: true } };
  const setTabs = (next) => setConfig(prev => ({ ...prev, tabs: next }));

  const moveTab = (fromIdx, toIdx) => {
    const order = [...tabs.order];
    const [item] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, item);
    setTabs({ ...tabs, order });
  };
  const toggleTab = (key) => {
    setTabs({ ...tabs, enabled: { ...tabs.enabled, [key]: !tabs.enabled[key] } });
  };

  const features = config.features || { voice: true, dragdrop: true, counter: true };
  const toggleFeature = (k) => setConfig(prev => ({ ...prev, features: { ...prev.features, [k]: !prev.features[k] } }));

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-xl w-[820px] max-w-[96vw] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Admin Settings</div>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
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
            <div>
              <div className="font-medium mt-3 mb-1">Features</div>
              <label className="flex items-center justify-between"><span>Voice input</span><input type="checkbox" checked={features.voice} onChange={()=> toggleFeature('voice')} /></label>
              <label className="flex items-center justify-between"><span>Drag & Drop</span><input type="checkbox" checked={features.dragdrop} onChange={()=> toggleFeature('dragdrop')} /></label>
              <label className="flex items-center justify-between"><span>Counter</span><input type="checkbox" checked={features.counter} onChange={()=> toggleFeature('counter')} /></label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-medium">Preview</div>
            <div className="flex gap-2">
              <Button size="sm" variant={config.preview.mode==='embedded'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, mode:'embedded'}}))}>Embedded</Button>
              <Button size="sm" variant={config.preview.mode==='fullscreen'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, mode:'fullscreen'}}))}>Fullscreen</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={config.preview.placement==='center'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, placement:'center'}}))}>Center</Button>
              <Button size="sm" variant={config.preview.placement==='right'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, placement:'right'}}))}>Right</Button>
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