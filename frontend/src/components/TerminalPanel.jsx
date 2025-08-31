import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Separator } from "../components/ui/separator";
import { toast } from "../hooks/use-toast";
import { Copy, Download, Save, Share2, Trash2, Play } from "lucide-react";
import { mockAppendChunk, STORAGE_KEYS, saveToStorage, loadFromStorage } from "../mock/mock";

export default function TerminalPanel({ t, selectedAgentId, lang }) {
  const [content, setContent] = useState(loadFromStorage(STORAGE_KEYS.terminal, ""));
  const [auto, setAuto] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.terminal, content);
  }, [content]);

  useEffect(() => {
    if (auto) {
      timerRef.current = setInterval(() => {
        setContent(prev => (prev ? prev + "\n" : "") + mockAppendChunk(selectedAgentId));
      }, 4000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auto, selectedAgentId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      toast({ title: t.copy, description: t.appended });
    } catch (e) {}
  };

  const handleDownload = () => {
    const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `megamind_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveHistory = () => {
    const history = loadFromStorage(STORAGE_KEYS.history, []);
    const entry = { id: `h_${Date.now()}`, at: Date.now(), content, agent: selectedAgentId };
    const next = [entry, ...history].slice(0, 100);
    saveToStorage(STORAGE_KEYS.history, next);
    toast({ title: t.save, description: t.savedToHistory });
  };

  const handleShare = async () => {
    if (!content) return toast({ title: t.share, description: t.nothingToShare });
    if (navigator.share) {
      try {
        await navigator.share({ title: "MegaMind_X", text: content });
      } catch (e) {}
    } else {
      await handleCopy();
    }
  };

  const monofont = useMemo(() => (lang === "ru" ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace" : "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"), [lang]);

  return (
    <Card className="h-full flex flex-col bg-card/70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t.terminal}</CardTitle>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              {t.autoUpdate}
              <Switch checked={auto} onCheckedChange={setAuto} />
            </label>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex-1 p-3">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="# Output from agents appears here..."
            className="h-[420px] md:h-[520px] w-full resize-none bg-background/60 border-input font-mono text-sm leading-relaxed"
            style={{ fontFamily: monofont }}
          />
        </div>
        <div className="border-t border-border p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" /> {t.copy}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.copy}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> {t.download}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSaveHistory}>
              <Save className="w-4 h-4 mr-2" /> {t.save}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> {t.share}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setContent(prev => (prev ? prev + "\n" : "") + mockAppendChunk(selectedAgentId))}>
              <Play className="w-4 h-4 mr-2" /> {t.appended}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setContent("") }>
              <Trash2 className="w-4 h-4 mr-2" /> {t.clear}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}