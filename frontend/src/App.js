import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Moon, Sun, Globe2, ShieldCheck, Database, Settings2, Command, Radio, PanelLeft, PanelRight } from "lucide-react";
import { getAgents, refreshAgents, patchAgent, getHistory, createHistory, appendOutput } from "./lib/api";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { connectStream } from "./lib/stream";
import { AgentsSchema, HistorySchema } from "./lib/schema";
import AdminOverlay from "./components/AdminOverlay";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableBlock from "./components/DraggableBlock";

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
  // expose default config for AdminOverlay Reset
  useEffect(() => { window.MMX_DEFAULT_CONFIG = defaultConfig; window.__MMX_DEFAULT_CONFIG__ = defaultConfig; }, [glowMode]);

  // Sanitize ui config
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
  // Apply safe mode class
  useEffect(() => {
    try { const root = document.documentElement; const body = document.body; if (uiConfig.safeMode) { root.classList.add('safe-mode'); body.classList.add('safe-mode'); } else { root.classList.remove('safe-mode'); body.classList.remove('safe-mode'); } } catch(_){}
  }, [uiConfig.safeMode]);

  const [leftOpen, setLeftOpen] = useState(loadFromStorage(STORAGE_KEYS.leftOpen, true));
  const [rightOpen, setRightOpen] = useState(loadFromStorage(STORAGE_KEYS.rightOpen, false));
  useEffect(() => { saveToStorage(STORAGE_KEYS.leftOpen, leftOpen); }, [leftOpen]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.rightOpen, rightOpen); }, [rightOpen]);

  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
  useEffect(() => {
    const onResize = () => { const narrow = window.innerWidth <= 1024; setIsNarrow(narrow); if (narrow) { setLeftOpen(false); setRightOpen(false); } };
    window.addEventListener('resize', onResize); onResize(); return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { (async () => {
    try { const a = await getAgents(); const safe = AgentsSchema.safeParse(a); if (safe.success) setAgents(safe.data); else toast({ title: "Agents", description: "Invalid data" }); } catch(e){ /* ignore */ }
    try { const h = await getHistory(); const safeH = HistorySchema.safeParse(h); if (safeH.success) setHistory(safeH.data); } catch(e){}
  })(); }, []);

  const [connStatus, setConnStatus] = useState('connecting');
  useEffect(() => { const conn = connectStream({ sessionId, onMessage: (payload) => {
    if (payload?.type === 'output' && payload.data?.content) {
      const line = payload.data.content; const ta = document.querySelector('textarea'); if (ta) { const next = (ta.value ? ta.value + "\n" : "") + line; ta.value = next; saveToStorage(STORAGE_KEYS.terminal, next); }
    }}, onStatusChange: setConnStatus }); return () => conn.close(); }, [sessionId]);

  const refreshing = useRef(false);
  const handleRefreshStatuses = async () => { if (refreshing.current) return; refreshing.current = true; try { await refreshAgents(); const a = await getAgents(); const safe = AgentsSchema.safeParse(a); if (safe.success) setAgents(safe.data); toast({ title: t.refresh, description: "OK" }); } catch(e){ toast({ title: t.refresh, description: "Failed" }); } finally { setTimeout(()=> refreshing.current=false, 600);} };
  const handleToggleAgent = async (id, value) => { try { await patchAgent(id, { enabled: value }); setAgents(prev => prev.map(a => (a.id === id ? { ...a, enabled: value } : a))); } catch(e){} };
  const handleSaveHistory = async (content) => { try { const item = await createHistory({ agentId: selectedAgentId, content }); setHistory(prev => [item, ...prev].slice(0,100)); } catch(e){} };

  const [openCmd, setOpenCmd] = useState(false);
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpenCmd(v => !v); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);

  // Preview state & handlers
  const [previewOpen, setPreviewOpen] = useState(false);
  const openPreview = () => { setPreviewOpen(true); };

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-full">
        {/* Desktop left sidebar */}
        {leftOpen && !isNarrow && !uiConfig.layout.swapSidebars && (
          <div className="hidden lg:block h-full">
            <MegaSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={uiConfig.effects.glowMode} onCollapse={() => setLeftOpen(false)} />
          </div>
        )}
        {/* Main content area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <Topbar t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={(l)=>{ setLang(l); saveToStorage(STORAGE_KEYS.lang, l); }} adminLevel={adminLevel} setAdminLevel={setAdminLevel} panels={panels} setPanels={setPanels} onOpenCmd={()=>setOpenCmd(true)} glowMode={uiConfig.effects.glowMode} setGlowMode={(m)=> setUiConfig(prev => ({ ...prev, effects: { ...prev.effects, glowMode: m } }))} connStatus={connStatus} onOpenPreview={openPreview} canOpenPreview={true} onOpenAdmin={()=> setAdminOpen(true)} customButtons={uiConfig.custom.buttons} />

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
                  <div className="h-full flex flex-col min-h-0 overflow-auto">
                    <Dashboard />
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                      <div className="xl:col-span-2"><AdminPanel t={t} adminLevel={adminLevel} /></div>
                      <div className="xl:col-span-1">
                        <Card className="bg-card/70">
                          <CardHeader className="pb-2 sticky top-0 z-10 bg-card/80"><CardTitle className="text-base">{t.agents}</CardTitle></CardHeader>
                          <Separator />
                          <CardContent className="pt-3">
                            <ScrollArea className="h-[520px] pr-2">
                              {agents.map(a => (
                                <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                  <div className="text-sm flex items-center gap-2">
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${a.status === 'online' ? 'bg-emerald-500' : a.status === 'broken' ? 'bg-rose-500' : 'bg-zinc-400'}`}></span>
                                    <span className="font-medium">{a.name}</span>
                                    {a.ai && <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">AI</span>}
                                    <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                                  </div>
                                  <Switch checked={a.enabled} onCheckedChange={(v) => handleToggleAgent(a.id, v)} />
                                </div>
                              ))}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    <div className="mt-4"><ClientLogs /></div>
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

        {/* Right sidebar */}
        {rightOpen && !isNarrow && !uiConfig.layout.swapSidebars && (
          <div className="hidden lg:block h-full">
            <RightSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={uiConfig.effects.glowMode} onCollapse={() => setRightOpen(false)} />
          </div>
        )}
      </div>

      {/* Admin Overlay */}
      {adminOpen && (
        <AdminOverlay onClose={() => setAdminOpen(false)} config={uiConfig} setConfig={setUiConfig} />
      )}

      {/* Internal Preview Overlay (portal) */}
      <PreviewOverlay t={t} open={previewOpen} onClose={() => setPreviewOpen(false)} onSetMode={(m)=> saveToStorage(STORAGE_KEYS.previewMode, m)} placement={uiConfig.preview.placement} />

      <Toaster />
    </div>
    </DndProvider>
  );
}

export default App;