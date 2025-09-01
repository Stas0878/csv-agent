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

function Topbar({ t, theme, setTheme, lang, setLang, adminLevel, setAdminLevel, panels, setPanels, onOpenCmd, glowMode, setGlowMode, connStatus }) {
  const dot = connStatus === 'live' ? 'bg-emerald-500' : connStatus === 'reconnecting' ? 'bg-amber-500' : connStatus === 'connecting' ? 'bg-cyan-500' : 'bg-rose-500';
  const statusText = connStatus === 'live' ? 'Live' : connStatus === 'reconnecting' ? 'Reconnecting' : connStatus === 'connecting' ? 'Connecting' : 'Offline';
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center gap-2 md:gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <BrandLogo className="hidden md:inline-flex mr-2" size={18} glowMode={glowMode} />
              </div>
            </TooltipTrigger>
            <TooltipContent>{t.logoTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TabsList className="hidden md:flex">
          <TabsTrigger value="terminal">{t.terminal}</TabsTrigger>
          <TabsTrigger value="admin">{t.admin}</TabsTrigger>
          <TabsTrigger value="history">{t.history}</TabsTrigger>
        </TabsList>
        <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-border">
          <span className="text-xs text-muted-foreground">Панели</span>
          <div className="flex items-center gap-2 text-xs">
            <span>Терминал</span>
            <Switch checked={panels.terminal} onCheckedChange={(v) => setPanels(p => ({ ...p, terminal: v }))} />
            <span>Админ</span>
            <Switch checked={panels.admin} onCheckedChange={(v) => setPanels(p => ({ ...p, admin: v }))} />
            <span>История</span>
            <Switch checked={panels.history} onCheckedChange={(v) => setPanels(p => ({ ...p, history: v }))} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 pr-3 mr-1 border-r border-border text-xs text-muted-foreground">
          <span>{t.logoGlow}</span>
          <Select value={glowMode} onValueChange={(v) => setGlowMode(v)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue placeholder={t.glowMedium} />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="soft">{t.glowSoft}</SelectItem>
              <SelectItem value="medium">{t.glowMedium}</SelectItem>
              <SelectItem value="strong">{t.glowStrong}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded border border-border">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`} />
                <Radio className="w-4 h-4 opacity-70" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Stream: {statusText}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button variant="ghost" size="icon" onClick={onOpenCmd} aria-label="Command">
          <Command className="w-5 h-5" />
        </Button>
        <div className="hidden sm:flex items-center gap-3 pr-3 mr-1 border-r border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.accessLevel}</span>
          </div>
          <div className="w-40">
            <Slider value={[adminLevel]} onValueChange={(v) => setAdminLevel(v[0])} min={0} max={100} step={5} />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === LANG.RU ? LANG.EN : LANG.RU)} aria-label="Toggle language">
          <Globe2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function AdminPanel({ t, adminLevel }) {
  const disabled = adminLevel < 50;
  const FeatureRow = ({ icon: Icon, label }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-cyan-500" />
        <span>{label}</span>
      </div>
      <Switch disabled={disabled} />
    </div>
  );
  return (
    <Card className="bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t.features} • <span className="text-xs text-muted-foreground">{t.adminOnly}</span></CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-3">
        <FeatureRow icon={Settings2} label={t.manageAgents} />
        <FeatureRow icon={Database} label={t.clearCache} />
        <FeatureRow icon={ShieldCheck} label={t.forceRestart} />
        {disabled && (
          <p className="text-xs text-muted-foreground mt-3">{t.adminOnly}: 50+</p>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryPanel({ t, onLoad, history }) {
  if (!history.length) return <div className="text-sm text-muted-foreground">{t.noHistory}</div>;
  return (
    <ScrollArea className="h-[600px] pr-2">
      <div className="space-y-2">
        {history.map(item => (
          <Card key={item.id} className="hover:bg-accent/50 transition-colors">
            <CardHeader className="py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{new Date(item.createdAt).toLocaleString()}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => onLoad?.(item)}>
                  Load
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{item.content}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
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
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-[100dvh]">
        {leftOpen && (
          <div className="hidden sm:block w-72">
            <MegaSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setLeftOpen(false)} />
          </div>
        )}
        {!leftOpen && (
          <div className="hidden sm:flex w-3 items-center justify-center">
            <button className="bg-background border rounded-full w-6 h-6" onClick={() => setLeftOpen(true)} title="Expand">
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <Tabs value={tab} onValueChange={setTab}>
            <Topbar t={t} theme={theme} setTheme={setTheme} lang={lang} setLang={(l)=>{ setLang(l); saveToStorage(STORAGE_KEYS.lang, l); }} adminLevel={adminLevel} setAdminLevel={setAdminLevel} panels={panels} setPanels={setPanels} onOpenCmd={()=>setOpenCmd(true)} glowMode={glowMode} setGlowMode={setGlowMode} connStatus={connStatus} />

            <div className="flex-1 p-3 md:p-4">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="md:hidden mb-3">
                  {panels.terminal && <TabsTrigger value="terminal">{t.terminal}</TabsTrigger>}
                  {panels.admin && <TabsTrigger value="admin">{t.admin}</TabsTrigger>}
                  {panels.history && <TabsTrigger value="history">{t.history}</TabsTrigger>}
                </TabsList>

                {panels.terminal && (
                  <TabsContent value="terminal" className="m-0">
                    <InputComposer t={t} lang={lang} softMaxLength={5000} onSubmit={async ({text, files}) => {
                      await handleSaveHistory(text);
                      try { await appendOutput({ sessionId, agentId: selectedAgentId, content: `[input] ${text.slice(0,120)}` }); } catch(e){}
                      toast({ title: 'Sent', description: 'Сообщение отправлено' });
                    }} />
                    <div className="h-3" />
                    <TerminalPanel t={t} selectedAgentId={selectedAgentId} lang={lang} sessionId={sessionId} onSaved={handleSaveHistory} />
                  </TabsContent>
                )}

                {panels.admin && (
                  <TabsContent value="admin" className="m-0">
                    <div className="space-y-4">
                      <Dashboard />
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-2"><AdminPanel t={t} adminLevel={adminLevel} /></div>
                        <div className="xl:col-span-1">
                          <Card className="bg-card/70">
                            <CardHeader className="pb-2"><CardTitle className="text-base">{t.agents}</CardTitle></CardHeader>
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
                      <ClientLogs />
                    </div>
                  </TabsContent>
                )}

                {panels.history && (
                  <TabsContent value="history" className="m-0">
                    <HistoryPanel t={t} history={history} onLoad={(item) => { saveToStorage(STORAGE_KEYS.terminal, item.content); toast({ title: t.history, description: t.loadedFromHistory }); setTab("terminal"); }} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </Tabs>
        </div>

        {rightOpen && (
          <div className="hidden sm:block w-72">
            <RightSidebar t={t} agents={agents} selectedAgentId={selectedAgentId} onSelectAgent={setSelectedAgentId} onToggleAgent={handleToggleAgent} onRefresh={handleRefreshStatuses} glowMode={glowMode} onCollapse={() => setRightOpen(false)} />
          </div>
        )}
        {!rightOpen && (
          <div className="hidden sm:flex w-3 items-center justify-center">
            <button className="bg-background border rounded-full w-6 h-6" onClick={() => setRightOpen(true)} title="Expand">
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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