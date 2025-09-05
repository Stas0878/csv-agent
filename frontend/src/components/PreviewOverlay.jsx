import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { ExternalLink, RefreshCw, Share2, X, MonitorSmartphone, TabletSmartphone, Smartphone } from "lucide-react";

// Internal Preview Overlay rendered via portal to <body>
// Provides device presets (Desktop/Tablet/Mobile) and keeps 'Open in new tab' fallback

const PRESETS = {
  Desktop: { w: 1440, h: 900 },
  Tablet: { w: 1024, h: 768 },
  Mobile: { w: 390, h: 844 },
};

export default function PreviewOverlay({ t, open, onClose, onSetMode, placement = 'center' }) {
  const [nonce, setNonce] = useState(0);
  const [preset, setPreset] = useState(() => {
    try { return localStorage.getItem('mmx_preview_preset') || 'Desktop'; } catch(_) { return 'Desktop'; }
  });

  useEffect(() => { try { localStorage.setItem('mmx_preview_preset', preset); } catch(_){} }, [preset]);

  const url = useMemo(() => {
    try {
      const u = new URL(window.location.origin + window.location.pathname);
      u.searchParams.set('embed', '1');
      u.searchParams.set('_', String(nonce));
      return u.toString();
    } catch (_) {
      return window.location.origin + window.location.pathname + `?embed=1&_=${nonce}`;
    }
  }, [nonce]);

  if (!open) return null;

  const handleRefresh = () => setNonce(Date.now());
  const handleShare = async () => {
    const shareUrl = window.location.origin + window.location.pathname + '?embed=1';
    try {
      if (navigator.share) await navigator.share({ title: "MegaMind_X", url: shareUrl });
      else await navigator.clipboard.writeText(shareUrl);
    } catch (_) {}
  };
  const handleOpenNew = () => {
    onSetMode?.("fullscreen");
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('embed', '1');
    window.open(u.toString(), "_blank", "noopener,noreferrer");
  };

  const dims = PRESETS[preset] || PRESETS.Desktop;

  const content = (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background/70 backdrop-blur">
      <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b bg-card/90">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>{t?.preview || 'Preview'}</span>
          <div className="flex items-center gap-1 ml-3">
            <Button size="sm" variant={preset==='Desktop'?'secondary':'outline'} onClick={()=> setPreset('Desktop')} aria-label="Desktop">
              <MonitorSmartphone className="w-4 h-4 mr-1" /> Desktop
            </Button>
            <Button size="sm" variant={preset==='Tablet'?'secondary':'outline'} onClick={()=> setPreset('Tablet')} aria-label="Tablet">
              <TabletSmartphone className="w-4 h-4 mr-1" /> Tablet
            </Button>
            <Button size="sm" variant={preset==='Mobile'?'secondary':'outline'} onClick={()=> setPreset('Mobile')} aria-label="Mobile">
              <Smartphone className="w-4 h-4 mr-1" /> Mobile
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleOpenNew} aria-label="Open in new tab">
            <ExternalLink className="w-4 h-4 mr-2" /> {t?.openInNewTab || 'Open in new tab'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRefresh} aria-label="Refresh preview">
            <RefreshCw className="w-4 h-4 mr-2" /> {t?.refreshPreview || 'Refresh'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleShare} aria-label="Share link">
            <Share2 className="w-4 h-4 mr-2" /> {t?.shareLink || 'Share link'}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close preview">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-2">
        <div className="bg-card border rounded shadow overflow-hidden" style={{ width: `${dims.w}px`, height: `${dims.h}px` }}>
          <iframe title="Live Preview" src={url} className="w-full h-full border-0 bg-white" />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}