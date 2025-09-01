import React from "react";
import { Button } from "./ui/button";

export default function AdminOverlay({ onClose, config, setConfig }) {
  const toggleSwap = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, swapSidebars: !prev.layout.swapSidebars } }));
  const toggleLeft = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, leftCollapsed: !prev.layout.leftCollapsed } }));
  const toggleRight = () => setConfig(prev => ({ ...prev, layout: { ...prev.layout, rightCollapsed: !prev.layout.rightCollapsed } }));
  const setComposer = (pos) => setConfig(prev => ({ ...prev, layout: { ...prev.layout, composerPosition: pos } }));

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-xl w-[680px] max-w-[96vw] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Admin Settings</div>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
            <div className="font-medium">Preview</div>
            <div className="flex gap-2">
              <Button size="sm" variant={config.preview.mode==='embedded'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, mode:'embedded'}}))}>Embedded</Button>
              <Button size="sm" variant={config.preview.mode==='fullscreen'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, mode:'fullscreen'}}))}>Fullscreen</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={config.preview.placement==='center'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, placement:'center'}}))}>Center</Button>
              <Button size="sm" variant={config.preview.placement==='right'?'secondary':'outline'} onClick={()=> setConfig(prev=>({...prev, preview:{...prev.preview, placement:'right'}}))}>Right</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}