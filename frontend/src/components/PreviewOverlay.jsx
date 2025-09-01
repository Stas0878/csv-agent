import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ExternalLink, RefreshCw, Share2, X } from "lucide-react";

export default function PreviewOverlay({ t, open, onClose, src, onSetMode }) {
  const [nonce, setNonce] = useState(0);
  const url = useMemo(() => {
    const base = src || `${window.location.origin}/?embed=1`;
    return `${base}${base.includes("?") ? "&" : "?"}_=${nonce}`;
  }, [src, nonce]);

  if (!open) return null;

  const handleRefresh = () => setNonce(Date.now());
  const handleShare = async () => {
    const shareUrl = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MegaMind_X", url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (_) {}
  };
  const handleOpenNew = () => {
    onSetMode?.("fullscreen");
    window.open(window.location.origin, "_blank", "noopener,noreferrer");
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background/80 backdrop-blur">
      <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b bg-card/80">
        <div className="text-sm font-medium">{t.preview}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleOpenNew} aria-label="Open in new tab">
            <ExternalLink className="w-4 h-4 mr-2" /> {t.openInNewTab}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRefresh} aria-label="Refresh preview">
            <RefreshCw className="w-4 h-4 mr-2" /> {t.refreshPreview}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleShare} aria-label="Share link">
            <Share2 className="w-4 h-4 mr-2" /> {t.shareLink}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close preview">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <iframe title="Live Preview" src={url} className="w-full h-full border-0 bg-white" />
      </div>
    </div>
  );
}