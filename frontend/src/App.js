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

  const [leftOpen, setLeftOpen] = useState(loadFromStorage(STORAGE_KEYS.leftOpen, true));
  const [rightOpen, setRightOpen] = useState(loadFromStorage(STORAGE_KEYS.rightOpen, false));
  useEffect(() => { saveToStorage(STORAGE_KEYS.leftOpen, leftOpen); }, [leftOpen]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.rightOpen, rightOpen); }, [rightOpen]);

  // Responsive: track viewport and auto-collapse on <= 1024px
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 1024 : false);
  useEffect(() => {
    const onResize = () => {
      const narrow = window.innerWidth <= 1024;
      setIsNarrow(narrow);
      if (narrow) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { (async () => {
    try { const a = await getAgents(); const safe = AgentsSchema.safeParse(a); if (safe.success) setAgents(safe.data); else toast({ title: "Agents", description: "Invalid data" }); } catch(e){ toast({ title: "Agents", description: "Failed to load" }); }
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-full">
        {/* Desktop left sidebar */}
        {leftOpen && !isNarrow && (
          <div className="hidden lg:block h-full">
            <MegaSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setLeftOpen(false)} />
          </div>
        )}
        {!leftOpen && !isNarrow && (
          <div className="hidden lg:flex w-3 h-full items-center justify-center">
            <button className="bg-background border rounded-full w-6 h-6" onClick={() => setLeftOpen(true)} title="Expand" aria-label="Open left sidebar" aria-expanded={leftOpen}>
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main content area: flex column, inner blocks scroll */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <Topbar t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={(l)=>{ setLang(l); saveToStorage(STORAGE_KEYS.lang, l); }} adminLevel={adminLevel} setAdminLevel={setAdminLevel} panels={panels} setPanels={setPanels} onOpenCmd={()=>setOpenCmd(true)} glowMode={glowMode} setGlowMode={setGlowMode} connStatus={connStatus} />

          {/* Content area fills remaining height and scrolls inside */}
          <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="md:hidden mb-3">
                {panels.terminal && <TabsTrigger value="terminal">{t.terminal}</TabsTrigger>}
                {panels.admin && <TabsTrigger value="admin">{t.admin}</TabsTrigger>}
                {panels.history && <TabsTrigger value="history">{t.history}</TabsTrigger>}
              </TabsList>

              {panels.terminal && (
                <TabsContent value="terminal" className="m-0 h-full">
                  <div className="h-full flex flex-col min-h-0">
                    {/* Terminal scrolls above */}
                    <div className="flex-1 min-h-0 overflow-auto mt-0">
                      <TerminalPanel t={t} selectedAgentId={selectedAgentId} lang={lang} sessionId={sessionId} onSaved={handleSaveHistory} />
                    </div>
                    {/* Composer pinned at bottom */}
                    <div className="pt-3">
                      <InputComposer t={t} lang={lang} softMaxLength={5000} onSubmit={async ({text, files}) => {
                        await handleSaveHistory(text);
                        try { await appendOutput({ sessionId, agentId: selectedAgentId, content: `[input] ${text.slice(0,120)}` }); } catch(e){}
                        toast({ title: 'Sent', description: 'Сообщение отправлено' });
                      }} />
                    </div>
                  </div>
                </TabsContent>
              )}

              {panels.admin && (
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

              {panels.history && (
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

        {/* Desktop right sidebar */}
        {rightOpen && !isNarrow && (
          <div className="hidden lg:block h-full">
            <RightSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setRightOpen(false)} />
          </div>
        )}
        {!rightOpen && !isNarrow && (
          <div className="hidden lg:flex w-3 h-full items-center justify-center">
            <button className="bg-background border rounded-full w-6 h-6" onClick={() => setRightOpen(true)} title="Expand" aria-label="Open right sidebar" aria-expanded={rightOpen}>
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile/Tablet overlays for sidebars */}
      {isNarrow && leftOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Left sidebar overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} aria-label="Close left sidebar backdrop"></div>
          <div className="absolute left-0 top-0 h-full w-56 lg:w-64 bg-card/95 shadow-xl animate-in slide-in-from-left">
            <MegaSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setLeftOpen(false)} />
          </div>
        </div>
      )}
      {isNarrow && rightOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Right sidebar overlay">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRightOpen(false)} aria-label="Close right sidebar backdrop"></div>
          <div className="absolute right-0 top-0 h-full w-56 lg:w-64 bg-card/95 shadow-xl animate-in slide-in-from-right">
            <RightSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setRightOpen(false)} />
          </div>
        </div>
      )}

      {/* Floating expand buttons on narrow screens */}
      {isNarrow && !leftOpen && (
        <button className="fixed left-2 top-1/2 -translate-y-1/2 z-40 bg-background/90 border rounded-full w-8 h-8 flex items-center justify-center shadow" onClick={() => setLeftOpen(true)} aria-label="Open left sidebar">
          <PanelLeft className="w-4 h-4" />
        </button>
      )}
      {isNarrow && !rightOpen && (
        <button className="fixed right-2 top-1/2 -translate-y-1/2 z-40 bg-background/90 border rounded-full w-8 h-8 flex items-center justify-center shadow" onClick={() => setRightOpen(true)} aria-label="Open right sidebar">
          <PanelRight className="w-4 h-4" />
        </button>
      )}

      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <CommandInput placeholder="Type a command..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { setTab('terminal'); setOpenCmd(false); }}>Terminal</CommandItem>
            <CommandItem onSelect={() => { setTab('admin'); setOpenCmd(false); }}>Admin</CommandItem>
            <CommandItem onSelect={() => { setTab('history'); setOpenCmd(false); }}>History</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { handleRefreshStatuses(); setOpenCmd(false); }}>Refresh statuses</CommandItem>
            <CommandItem onSelect={() => { saveToStorage('mmx_preset', loadFromStorage(STORAGE_KEYS.terminal, '')); toast({ title: 'Preset', description: 'Saved' }); setOpenCmd(false); }}>Save preset</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Toaster />
    </div>
  );
}

export default App;