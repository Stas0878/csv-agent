import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./index.css";
import MegaSidebar from "./components/MegaSidebar";
import TerminalPanel from "./components/TerminalPanel";
import { tDict, LANG, generateAgents, randomizeStatuses, STORAGE_KEYS, loadFromStorage, saveToStorage } from "./mock/mock";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Switch } from "./components/ui/switch";
import { Slider } from "./components/ui/slider";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { toast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/toaster";
import { Moon, Globe2, ShieldCheck, Database, Settings2 } from "lucide-react";

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

function Topbar({ t, theme, setTheme, lang, setLang, adminLevel, setAdminLevel, panels, setPanels }) {
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="flex items-center gap-2 md:gap-3">
        <TabsList className="hidden md:flex">
          <TabsTrigger value="terminal">{t.terminal}</TabsTrigger>
          <TabsTrigger value="admin">{t.admin}</TabsTrigger>
          <TabsTrigger value="history">{t.history}</TabsTrigger>
        </TabsList>
        <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-border">
          <span className="text-xs text-muted-foreground">{t.panels}</span>
          <div className="flex items-center gap-2 text-xs">
            <span>{t.enableTerminal}</span>
            <Switch checked={panels.terminal} onCheckedChange={(v) => setPanels(p => ({ ...p, terminal: v }))} />
            <span>{t.enableAdmin}</span>
            <Switch checked={panels.admin} onCheckedChange={(v) => setPanels(p => ({ ...p, admin: v }))} />
            <span>{t.enableHistory}</span>
            <Switch checked={panels.history} onCheckedChange={(v) => setPanels(p => ({ ...p, history: v }))} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 pr-3 mr-1 border-r border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.accessLevel}</span>
          </div>
          <div className="w-40">
            <Slider value={[adminLevel]} onValueChange={(v) => setAdminLevel(v[0])} min={0} max={100} step={5} />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Moon className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setLang(lang === LANG.RU ? LANG.EN : LANG.RU)}>
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

function HistoryPanel({ t, onLoad }) {
  const history = loadFromStorage(STORAGE_KEYS.history, []);
  if (!history.length) return <div className="text-sm text-muted-foreground">{t.noHistory}</div>;
  return (
    <ScrollArea className="h-[600px] pr-2">
      <div className="space-y-2">
        {history.map(item => (
          <Card key={item.id} className="hover:bg-accent/50 transition-colors">
            <CardHeader className="py-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{new Date(item.at).toLocaleString()}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => onLoad(item)}>
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
  // language
  const [lang, setLang] = useState(loadFromStorage(STORAGE_KEYS.lang, LANG.RU));
  const t = useMemo(() => tDict[lang], [lang]);

  // theme
  const { theme, setTheme } = useTheme();

  // admin
  const [adminLevel, setAdminLevel] = useState(loadFromStorage(STORAGE_KEYS.adminLevel, 40));
  useEffect(() => { saveToStorage(STORAGE_KEYS.adminLevel, adminLevel); }, [adminLevel]);

  // agents
  const [agents, setAgents] = useState(loadFromStorage(STORAGE_KEYS.agents, generateAgents()));
  const [selectedAgentId, setSelectedAgentId] = useState(loadFromStorage(STORAGE_KEYS.selectedAgent, agents[0]?.id));
  useEffect(() => { saveToStorage(STORAGE_KEYS.agents, agents); }, [agents]);
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

  const handleRefreshStatuses = () => {
    setAgents(prev => randomizeStatuses(prev));
    toast({ title: t.refresh, description: "OK" });
  };

  const handleToggleAgent = (id, value) => {
    setAgents(prev => prev.map(a => (a.id === id ? { ...a, enabled: value } : a)));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background to-background/60 text-foreground">
      <div className="flex h-[100dvh]">
        {/* Sidebar */}
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

        {/* Main */}
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
                  <TerminalPanel t={t} selectedAgentId={selectedAgentId} lang={lang} />
                </TabsContent>
              )}

              {panels.admin && (
                <TabsContent value="admin" className="m-0">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2">
                      <AdminPanel t={t} adminLevel={adminLevel} />
                    </div>
                    <div className="xl:col-span-1">
                      <Card className="bg-card/70">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{t.agents}</CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-3">
                          <ScrollArea className="h-[520px] pr-2">
                            {agents.map(a => (
                              <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                <div className="text-sm flex items-center gap-2">
                                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${a.status === 'online' ? 'bg-emerald-500' : a.status === 'broken' ? 'bg-rose-500' : 'bg-zinc-400'}`}></span>
                                  <span className="font-medium">{a.name}</span>
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
                </TabsContent>
              )}

              {panels.history && (
                <TabsContent value="history" className="m-0">
                  <HistoryPanel t={t} onLoad={(item) => {
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
      <Toaster />
    </div>
  );
}

export default App;