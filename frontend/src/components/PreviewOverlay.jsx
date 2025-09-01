import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ExternalLink, RefreshCw, Share2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PreviewOverlay({ t, open, onClose, src, onSetMode, placement = 'center' }) {
  const [nonce, setNonce] = useState(0);
  const url = useMemo(() => {
    try {
      const u = new URL(window.location.origin + window.location.pathname);
      u.searchParams.set('embed', '1');
      u.searchParams.set('_', String(nonce));
      return u.toString();
    } catch (_) {
      const base = `${window.location.origin}${window.location.pathname}?embed=1&_=${nonce}`;
      return base;
    }
  }, [nonce]);

  const handleRefresh = () => setNonce(Date.now());
  const handleShare = async () => {
    const shareUrl = window.location.href;
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
    const u = new URL(window.location.href);
    u.searchParams.set('embed', '1');
    window.open(u.toString(), "_blank", "noopener,noreferrer");
    onClose?.();
  };

  const frameWrapperClass = placement === 'right'
    ? 'ml-auto mr-2 md:mr-4 w-[92vw] md:w-[60vw]'
    : 'm-2 md:m-4';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col bg-background/80 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.24 }}
            className={`${frameWrapperClass} rounded-lg overflow-hidden border shadow-xl bg-card/90 backdrop-blur`}
          >
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
            {/* Fallback hint if something blocks same-origin preview (CSP, router): */}
            {/* <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">Если предпросмотр не отображается, откройте в новой вкладке.</div> */}
            <div className="h-[calc(100vh-2rem-3rem)] md:h-[calc(100vh-2rem-3rem)]">
              <iframe title="Live Preview" src={url} className="w-full h-full border-0 bg-white rounded-b-lg" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}