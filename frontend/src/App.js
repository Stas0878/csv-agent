import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "./index.css";
import MegaSidebar from "./components/MegaSidebar";
import TerminalPanel from "./components/TerminalPanel";
import Dashboard from "./components/Dashboard";
import BrandLogo from "./components/BrandLogo";
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
import { Moon, Sun, Globe2, ShieldCheck, Database, Settings2, Command } from "lucide-react";
import { getAgents, refreshAgents, patchAgent, getHistory, createHistory, sseUrl } from "./lib/api";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./components/ui/command";

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

function Topbar({ t, theme, setTheme, lang, setLang, adminLevel, setAdminLevel, panels, setPanels, onOpenCmd }) {
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center gap-2 md:gap-3">
        <BrandLogo className="hidden md:inline-flex mr-2" size={18} />
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
        {/* ... unchanged ... */}
      </CardContent>
    </Card>
  );
}

function HistoryPanel({ t, onLoad, history }) {
  if (!history.length) return <div className="text-sm text-muted-foreground">{t.noHistory}</div>;
  return (
    <ScrollArea className="h-[600px] pr-2">
      {/* ... unchanged ... */}
    </ScrollArea>
  );
}

function App() {
  // language (default RU)
  const [lang, setLang] = useState(loadFromStorage(STORAGE_KEYS.lang, LANG.RU));
  const t = useMemo(() => tDict[lang], [lang]);

  // theme
  const { theme, setTheme } = useTheme();

  // admin
  const [adminLevel, setAdminLevel] = useState(loadFromStorage(STORAGE_KEYS.adminLevel, 40));
  useEffect(() => { saveToStorage(STORAGE_KEYS.adminLevel, adminLevel); }, [adminLevel]);

  // session id for streaming
  const [sessionId] = useState(() => {
    const existing = loadFromStorage("mmx_session", "");
    if (existing) return existing;
    const sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    saveToStorage("mmx_session", sid);
    return sid;
  });

  // agents
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(loadFromStorage(STORAGE_KEYS.selectedAgent, "agent-01"));
  useEffect(() => { saveToStorage(STORAGE_KEYS.selectedAgent, selectedAgentId); }, [selectedAgentId]);

  // panels toggle
  const [panels, setPanels] = useState(loadFromStorage(STORAGE_KEYS.panels, { terminal: true, admin: true, history: true }));
  useEffect(() => { saveToStorage(STORAGE_KEYS.panels, panels); }, [panels]);

  // tabs
  const [tab, setTab] = useState(panels.terminal ? "terminal" : panels.admin ? "admin" : "history");
  useEffect(() => {
    if (!panels[tab]) {
      const next = panels.terminal ? "terminal" : panels.admin ? "admin" : "history";
      setTab(next);
    }
  }, [panels, tab]);

  // history
  const [history, setHistory] = useState([]);

  // Load agents + history on mount
  useEffect(() => {
    (async () => {
      try {
        const a = await getAgents();
        setAgents(a);
      } catch (e) {
        toast({ title: "Agents", description: "Failed to load" });
      }
      try {
        const h = await getHistory();
        setHistory(h);
      } catch (e) {}
    })();
  }, []);

  // SSE subscribe to outputs with WS fallback (unchanged)
  const wsRef = useRef(null);
  useEffect(() => {
    const url = sseUrl("/stream", { sessionId });
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === "output" && payload.data?.content) {
          const line = payload.data.content;
          const ta = document.querySelector("textarea");
          if (ta) {
            const next = (ta.value ? ta.value + "\n" : "") + line;
            ta.value = next;
            saveToStorage(STORAGE_KEYS.terminal, next);
          }
        }
      } catch (e) {}
    };
    es.onerror = () => {
      if (!wsRef.current) {
        try {
          const base = process.env.REACT_APP_BACKEND_URL || "";
          const wsUrl = base.replace(/^http/, "ws") + `/api/ws/${sessionId}`;
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;
          ws.onmessage = (ev) => {
            try {
              const payload = JSON.parse(ev.data);
              if (payload?.type === "output" && payload.data?.content) {
                const line = payload.data.content;
                const ta = document.querySelector("textarea");
                if (ta) {
                  const next = (ta.value ? ta.value + "\n" : "") + line;
                  ta.value = next;
                  saveToStorage(STORAGE_KEYS.terminal, next);
                }
              }
            } catch {}
          };
        } catch {}
      }
    };
    return () => {
      es.close();
      if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    };
  }, [sessionId]);

  const handleRefreshStatuses = async () => {
    try {
      await refreshAgents();
      const a = await getAgents();
      setAgents(a);
      toast({ title: t.refresh, description: "OK" });
    } catch (e) {
      toast({ title: t.refresh, description: "Failed" });
    }
  };

  const handleToggleAgent = async (id, value) => {
    try {
      await patchAgent(id, { enabled: value });
      setAgents(prev => prev.map(a => (a.id === id ? { ...a, enabled: value } : a)));
    } catch (e) {}
  };

  const handleSaveHistory = async (content) => {
    try {
      const item = await createHistory({ agentId: selectedAgentId, content });
      setHistory(prev => [item, ...prev].slice(0, 100));
    } catch (e) {}
  };

  const [openCmd, setOpenCmd] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpenCmd(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-[100dvh]">
        <div className="hidden sm:block w-72">
          <MegaSidebar
            t={t}
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onToggleAgent={handleToggleAgent}
            onRefresh={handleRefreshStatuses}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <Tabs value={tab} onValueChange={setTab}>
            <Topbar
              t={t}
              theme={theme}
              setTheme={setTheme}
              lang={lang}
              setLang={(l) => { setLang(l); saveToStorage(STORAGE_KEYS.lang, l); }}
              adminLevel={adminLevel}
              setAdminLevel={setAdminLevel}
              panels={panels}
              setPanels={setPanels}
              onOpenCmd={() => setOpenCmd(true)}
            />

            <div className="flex-1 p-3 md:p-4">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="md:hidden mb-3">
                  {panels.terminal && <TabsTrigger value="terminal">{t.terminal}</TabsTrigger>}
                  {panels.admin && <TabsTrigger value="admin">{t.admin}</TabsTrigger>}
                  {panels.history && <TabsTrigger value="history">{t.history}</TabsTrigger>}
                </TabsList>

                {panels.terminal && (
                  <TabsContent value="terminal" className="m-0">
                    <Dashboard />
                    <div className="h-3" />
                    <TerminalPanel t={t} selectedAgentId={selectedAgentId} lang={lang} sessionId={sessionId} onSaved={handleSaveHistory} />
                  </TabsContent>
                )}

                {panels.admin && (
                  <TabsContent value="admin" className="m-0">
                    {/* admin content unchanged */}
                  </TabsContent>
                )}

                {panels.history && (
                  <TabsContent value="history" className="m-0">
                    <HistoryPanel t={t} history={history} onLoad={(item) => {
                      saveToStorage(STORAGE_KEYS.terminal, item.content);
                      toast({ title: t.history, description: t.loadedFromHistory });
                      setTab("terminal");
                    }} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </Tabs>
        </div>
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