import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";

export default function AdminSettingsDialog({ t, open, onOpenChange, config, setConfig, onSetPreviewMode }) {
  const [local, setLocal] = useState(config);
  useEffect(()=>{ setLocal(config); }, [config]);

  const update = (path, value) => {
    const next = { ...local };
    const segs = path.split('.');
    let ref = next;
    for (let i = 0; i < segs.length - 1; i++) ref = ref[segs[i]] = { ...ref[segs[i]] };
    ref[segs[segs.length-1]] = value;
    setLocal(next);
  };

  const save = () => {
    setConfig(local);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.adminSettings}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-medium mb-2">{t.layout}</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span>{t.swapSidebars}</span>
                <Switch checked={local.layout.swapSidebars} onCheckedChange={v => update('layout.swapSidebars', v)} />
              </label>
              <label className="flex items-center justify-between">
                <span>{t.leftSidebar} — {t.collapse}</span>
                <Switch checked={local.layout.leftCollapsed} onCheckedChange={v => update('layout.leftCollapsed', v)} />
              </label>
              <label className="flex items-center justify-between">
                <span>{t.rightSidebar} — {t.collapse}</span>
                <Switch checked={local.layout.rightCollapsed} onCheckedChange={v => update('layout.rightCollapsed', v)} />
              </label>
              <div>
                <div className="text-sm mb-1">{t.composerPosition}</div>
                <Select value={local.layout.composerPosition} onValueChange={(v)=> update('layout.composerPosition', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">{t.above}</SelectItem>
                    <SelectItem value="below">{t.below}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm mb-1">{t.previewMode}</div>
                <Select value={local.preview.mode} onValueChange={(v)=> { update('preview.mode', v); onSetPreviewMode?.(v); }}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="embedded">{t.embedded}</SelectItem>
                    <SelectItem value="fullscreen">{t.fullscreen}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm mb-1">{t.previewPlacement}</div>
                <Select value={local.preview.placement} onValueChange={(v)=> update('preview.placement', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">{t.center}</SelectItem>
                    <SelectItem value="right">{t.right}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">{t.effects}</div>
            <div className="space-y-3">
              <div>
                <div className="text-sm mb-1">Glow</div>
                <Select value={local.effects.glowMode} onValueChange={(v)=> update('effects.glowMode', v)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">{t.glowSoft}</SelectItem>
                    <SelectItem value="medium">{t.glowMedium}</SelectItem>
                    <SelectItem value="strong">{t.glowStrong}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center justify-between">
                <span>{t.parallax}</span>
                <Switch checked={local.effects.parallax} onCheckedChange={(v)=> update('effects.parallax', v)} />
              </label>
              <div>
                <div className="text-sm mb-1">{t.parallaxIntensity}</div>
                <input type="range" min={0} max={100} value={local.effects.parallaxIntensity} onChange={(e)=> update('effects.parallaxIntensity', Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <div className="text-sm mb-1">{t.accentHue}: {local.effects.accentHue}</div>
                <input type="range" min={0} max={360} value={local.effects.accentHue} onChange={(e)=> update('effects.accentHue', Number(e.target.value))} className="w-full" />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-sm font-medium mb-2">{t.featureToggles}</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span>{t.voiceInput}</span>
                <Switch checked={local.features.voice} onCheckedChange={(v)=> update('features.voice', v)} />
              </label>
              <label className="flex items-center justify-between">
                <span>{t.dragDrop}</span>
                <Switch checked={local.features.dragdrop} onCheckedChange={(v)=> update('features.dragdrop', v)} />
              </label>
              <label className="flex items-center justify-between">
                <span>{t.counter}</span>
                <Switch checked={local.features.counter} onCheckedChange={(v)=> update('features.counter', v)} />
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-2">{t.customButtons}</div>
            <CustomButtonsEditor local={local} update={update} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={()=> onOpenChange(false)}>{t.close}</Button>
          <Button onClick={save}>{t.save}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomButtonsEditor({ local, update }) {
  const [label, setLabel] = useState("");
  const add = () => {
    if (!label.trim()) return;
    const next = [...(local.custom.buttons||[]), { id: `btn_${Date.now()}`, label: label.trim() }];
    update('custom.buttons', next);
    setLabel("");
  };
  const remove = (id) => {
    update('custom.buttons', (local.custom.buttons||[]).filter(b => b.id !== id));
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input placeholder="Label" value={label} onChange={(e)=> setLabel(e.target.value)} className="h-8" />
        <Button size="sm" onClick={add}>+</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(local.custom.buttons||[]).map(b => (
          <div key={b.id} className="px-2 py-1 border rounded flex items-center gap-2 text-sm">
            <span>{b.label}</span>
            <Button size="sm" variant="ghost" onClick={()=> remove(b.id)}>×</Button>
          </div>
        ))}
        {!(local.custom.buttons||[]).length && (
          <div className="text-xs text-muted-foreground">Нет пользовательских кнопок</div>
        )}
      </div>
    </div>
  );
}