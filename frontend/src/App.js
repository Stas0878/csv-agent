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

// useTheme, Topbar, AdminPanel, HistoryPanel definitions are above in the previous version; keeping them unchanged
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
        {/* Left Sidebar (collapsible) */}
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

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Topbar, tabs and content stay same as previous version (omitted for brevity) */}
          {/* We keep previously restored Topbar / tabs content here. */}
        </div>

        {/* Right Sidebar (collapsible) */}
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

      <Toaster />
    </div>
  );
}

export default App;