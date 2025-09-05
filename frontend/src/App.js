import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./App.css";
import "./index.css";
import MegaSidebar from "./components/MegaSidebar";
import RightSidebar from "./components/RightSidebar";
import TerminalPanel from "./components/TerminalPanel";
import InputComposer from "./components/InputComposer";
import Dashboard from "./components/Dashboard";
import BrandLogo from "./components/BrandLogo";
import ClientLogs from "./components/ClientLogs";
import Topbar from "./components/Topbar";
import AdminPanel from "./components/AdminPanel";
import HistoryPanel from "./components/HistoryPanel";
import PreviewOverlay from "./components/PreviewOverlay";
import BackButton from "./components/BackButton";
import { tDict, LANG, STORAGE_KEYS, loadFromStorage, saveToStorage } from "./mock/mock";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Switch } from "./components/ui/switch";
import { Slider } from "./components/ui/slider";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { toast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";
import { getAgents, refreshAgents, patchAgent, getHistory, createHistory, appendOutput } from "./lib/api";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./components/ui/command";
import { connectStream } from "./lib/stream";
import { AgentsSchema, HistorySchema } from "./lib/schema";
import AdminOverlay from "./components/AdminOverlay";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useNavigationHistory } from "./hooks/useNavigationHistory";

function useTheme() {
  const [theme, setTheme] = useState(loadFromStorage(STORAGE_KEYS.theme, "dark"));
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    saveToStorage(STORAGE_KEYS.theme, theme);
  }, [theme]);
  return { theme, setTheme };
}

function App() {
  const [lang, setLang] = useState(loadFromStorage(STORAGE_KEYS.lang, LANG.RU));
  const t = useMemo(() => tDict[lang], [lang]);
  const { theme, setTheme } = useTheme();
  const [adminLevel, setAdminLevel] = useState(loadFromStorage(STORAGE_KEYS.adminLevel, 40));
  useEffect(() => { saveToStorage(STORAGE_KEYS.adminLevel, adminLevel); }, [adminLevel]);
  const [glowMode, setGlowMode] = useState(() => {
    const v = loadFromStorage(STORAGE_KEYS.logoGlow, "strong");
    if (typeof v === "boolean") return v ? "strong" : "soft";
    if (["soft","medium","strong"].includes(v)) return v; return "strong";
  });
  useEffect(() => { saveToStorage(STORAGE_KEYS.logoGlow, glowMode); }, [glowMode]);
  const [sessionId] = useState(() => { const existing = loadFromStorage("mmx_session", ""); if (existing) return existing; const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; saveToStorage("mmx_session", sid); return sid; });

  // EMBED-SAFE: detect embed=1 and run in simplified safe mode
  const isEmbed = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('embed') === '1'; } catch { return false; }
  }, []);

  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(loadFromStorage(STORAGE_KEYS.selectedAgent, "agent-01"));
  useEffect(() => { saveToStorage(STORAGE_KEYS.selectedAgent, selectedAgentId); }, [selectedAgentId]);
  const [panels, setPanels] = useState(loadFromStorage(STORAGE_KEYS.panels, { terminal: true, admin: true, history: true }));
  useEffect(() => { saveToStorage(STORAGE_KEYS.panels, panels); }, [panels]);
  const [tab, setTab] = useState(panels.terminal ? "terminal" : panels.admin ? "admin" : "history");
  useEffect(() => { if (!panels[tab]) { const next = panels.terminal ? "terminal" : panels.admin ? "admin" : "history"; setTab(next); } }, [panels, tab]);
  const [history, setHistory] = useState([]);

  const defaultConfig = {
    layout: { swapSidebars: false, leftCollapsed: false, rightCollapsed: false, composerPosition: 'above' },
    preview: { mode: loadFromStorage(STORAGE_KEYS.previewMode, 'embedded'), placement: 'center' },
    effects: { glowMode, parallax: false, parallaxIntensity: 30, accentHue: 190 },
    features: { voice: true, dragdrop: true, counter: true },
    tabs: { order: ['terminal','admin','history'], enabled: { terminal: true, admin: true, history: true } },
    custom: { buttons: [] },
    safeMode: false,
  };
  useEffect(() => { window.MMX_DEFAULT_CONFIG = defaultConfig; window.__MMX_DEFAULT_CONFIG__ = defaultConfig; }, [glowMode]);

  const sanitizeConfig = (cfg) => {
    try {
      const order = Array.isArray(cfg?.tabs?.order) ? cfg.tabs.order.filter(Boolean) : ['terminal','admin','history'];
      const enabled = cfg?.tabs?.enabled || { terminal: true, admin: true, history: true };
      const known = ['terminal','admin','history'];
      const safeOrder = order.filter(k => known.includes(k));
      const normalized = { ...defaultConfig, ...cfg, tabs: { order: safeOrder.length ? safeOrder : ['terminal','admin','history'], enabled } };
      return normalized;
    } catch(e) { return defaultConfig; }
  };

  const [uiConfig, setUiConfig] = useState(sanitizeConfig(loadFromStorage(STORAGE_KEYS.uiConfig, defaultConfig)));
  useEffect(() => { saveToStorage(STORAGE_KEYS.uiConfig, uiConfig); }, [uiConfig]);

  // Apply safe mode and embed-mode classes
  useEffect(() => {
    try {
      const root = document.documentElement; const body = document.body;
      if (uiConfig.safeMode || isEmbed) { root.classList.add('safe-mode'); body.classList.add('safe-mode'); }
      else { root.classList.remove('safe-mode'); body.classList.remove('safe-mode'); }
      if (isEmbed) { root.classList.add('embed-mode'); body.classList.add('embed-mode'); }
      else { root.classList.remove('embed-mode'); body.classList.remove('embed-mode'); }
    } catch(_){}
  }, [uiConfig.safeMode, isEmbed]);

  const [leftOpen, setLeftOpen] = useState(loadFromStorage(STORAGE_KEYS.leftOpen, true));
  const [rightOpen, setRightOpen] = useState(loadFromStorage(STORAGE_KEYS.rightOpen, false));
  useEffect(() => { saveToStorage(STORAGE_KEYS.leftOpen, leftOpen); }, [leftOpen]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.rightOpen, rightOpen); }, [rightOpen]);

  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
  useEffect(() => {
    const onResize = () => { const narrow = window.innerWidth <= 1024; setIsNarrow(narrow); if (narrow) { setLeftOpen(false); setRightOpen(false); } };
    window.addEventListener('resize', onResize); onResize(); return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (isEmbed) return; (async () => {
    try { const a = await getAgents(); const safe = AgentsSchema.safeParse(a); if (safe.success) setAgents(safe.data); } catch(e){ /* ignore */ }
    try { const h = await getHistory(); const safeH = HistorySchema.safeParse(h); if (safeH.success) setHistory(safeH.data); } catch(e){}
  })(); }, [isEmbed]);

  const [connStatus, setConnStatus] = useState('connecting');
  useEffect(() => { if (isEmbed) return; const conn = connectStream({ sessionId, onMessage: (payload) => {
    if (payload?.type === 'output' && payload.data?.content) {
      const line = payload.data.content; const ta = document.querySelector('textarea'); if (ta) { const next = (ta.value ? ta.value + "\n" : "") + line; ta.value = next; saveToStorage(STORAGE_KEYS.terminal, next); }
    }}, onStatusChange: setConnStatus }); return () => conn.close(); }, [sessionId, isEmbed]);

  const refreshing = useRef(false);
  const handleRefreshStatuses = async () => { if (refreshing.current) return; refreshing.current = true; try { await refreshAgents(); const a = await getAgents(); const safe = AgentsSchema.safeParse(a); if (safe.success) setAgents(safe.data); toast({ title: t.refresh, description: "OK" }); } catch(e){ toast({ title: t.refresh, description: "Failed" }); } finally { setTimeout(()=> refreshing.current=false, 600);} };
  const handleToggleAgent = async (id, value) => { try { await patchAgent(id, { enabled: value }); setAgents(prev => prev.map(a => (a.id === id ? { ...a, enabled: value } : a))); } catch(e){} };
  const handleSaveHistory = async (content) => { try { const item = await createHistory({ agentId: selectedAgentId, content }); setHistory(prev => [item, ...prev].slice(0,100)); } catch(e){} };

  const [openCmd, setOpenCmd] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  
  // Create stable function reference for admin overlay
  const handleOpenAdmin = useCallback(() => {
    console.log('Opening admin overlay');
    setAdminOpen(true);
  }, []);
  
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpenCmd(v => !v); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);

  // Preview state & handlers
  const [previewOpen, setPreviewOpen] = useState(false);
  // Force fullscreen preview: always open a new tab with ?embed=1
  const openPreview = () => {
    try {
      const u = new URL(window.location.origin + window.location.pathname);
      u.searchParams.set('embed', '1');
      window.open(u.toString(), '_blank', 'noopener,noreferrer');
    } catch (_) {}
  };

  // If embed, force-close admin/preview and sidebars
  useEffect(() => {
    if (isEmbed) { setPreviewOpen(false); setAdminOpen(false); setLeftOpen(false); setRightOpen(false); }
  }, [isEmbed]);

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-full">
        {/* Left sidebar hidden in embed */}
        {leftOpen && !isNarrow && !isEmbed && (
          <div className="hidden lg:block h-full">
            <MegaSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={uiConfig.effects.glowMode} onCollapse={() => setLeftOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <Topbar t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={(l)=>{ setLang(l); saveToStorage(STORAGE_KEYS.lang, l); }} adminLevel={adminLevel} setAdminLevel={setAdminLevel} panels={panels} setPanels={setPanels} onOpenCmd={()=>setOpenCmd(true)} glowMode={uiConfig.effects.glowMode} setGlowMode={(m)=> setUiConfig(prev => ({ ...prev, effects: { ...prev.effects, glowMode: m } }))} connStatus={connStatus} onOpenPreview={openPreview} canOpenPreview={!isEmbed} onOpenAdmin={!isEmbed ? handleOpenAdmin : undefined} customButtons={!isEmbed ? uiConfig.custom.buttons : []} />

          <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="md:hidden mb-3">
                {['terminal','admin','history'].filter(k => uiConfig.tabs.enabled?.[k] !== false).map(k => (
                  <TabsTrigger key={k} value={k}>{k === 'terminal' ? t.terminal : k === 'admin' ? t.admin : t.history}</TabsTrigger>
                ))}
              </TabsList>

              {uiConfig.tabs.enabled?.terminal !== false && (
                <TabsContent value="terminal" className="m-0 h-full">
                  <div className="h-full flex flex-col min-h-0">
                    {uiConfig.layout.composerPosition === 'above' && (
                      <div className="pb-3">
                        <InputComposer t={t} lang={lang} softMaxLength={5000} features={uiConfig.features} onSubmit={async ({text, files}) => {
                          await handleSaveHistory(text);
                          try { await appendOutput({ sessionId, agentId: selectedAgentId, content: `[input] ${text.slice(0,120)}` }); } catch(e){}
                          toast({ title: 'Sent', description: 'Сообщение отправлено' });
                        }} />
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-auto">
                      <TerminalPanel t={t} selectedAgentId={selectedAgentId} lang={lang} sessionId={sessionId} onSaved={handleSaveHistory} />
                    </div>
                    {uiConfig.layout.composerPosition === 'below' && (
                      <div className="pt-3">
                        <InputComposer t={t} lang={lang} softMaxLength={5000} features={uiConfig.features} onSubmit={async ({text, files}) => {
                          await handleSaveHistory(text);
                          try { await appendOutput({ sessionId, agentId: selectedAgentId, content: `[input] ${text.slice(0,120)}` }); } catch(e){}
                          toast({ title: 'Sent', description: 'Сообщение отправлено' });
                        }} />
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {uiConfig.tabs.enabled?.admin !== false && (
                <TabsContent value="admin" className="m-0 h-full">
                  <div className="h-full flex flex-col min-h-0 overflow-auto space-y-4">
                    <Dashboard />
                    <ClientLogs />
                  </div>
                </TabsContent>
              )}

              {uiConfig.tabs.enabled?.history !== false && (
                <TabsContent value="history" className="m-0 h-full">
                  <div className="h-full flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 overflow-auto">
                      <HistoryPanel t={t} history={history} onLoad={(item) => { saveToStorage(STORAGE_KEYS.terminal, item.content); toast({ title: t.history, description: t.loadedFromHistory }); setTab("terminal"); }} />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Right sidebar hidden in embed */}
        {rightOpen && !isNarrow && !isEmbed && (
          <div className="hidden lg:block h-full">
            <RightSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={uiConfig.effects.glowMode} onCollapse={() => setRightOpen(false)} />
          </div>
        )}
      </div>

      {/* Admin Overlay: not rendered in embed */}
      {!isEmbed && adminOpen && (
        <AdminOverlay onClose={() => { console.log('Closing admin overlay'); setAdminOpen(false); }} config={uiConfig} setConfig={setUiConfig} />
      )}

      {/* Embedded Preview disabled: always open new tab */}

      <Toaster />
    </div>
    </DndProvider>
  );
}

export default App;