import React from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { Badge } from "../components/ui/badge";
import { ChevronDown, RefreshCcw } from "lucide-react";

const StatusDot = ({ status }) => {
  const color = status === "online" ? "bg-emerald-500" : status === "broken" ? "bg-rose-500" : "bg-zinc-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-2`} />;
};

export default function MegaSidebar({ t, agents, selectedAgentId, onSelectAgent, onToggleAgent, onRefresh }) {
  const selected = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <aside className="h-full w-full sm:w-72 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col">
      <div className="px-4 py-4 border-b border-border flex items-center justify-end">
        <div className="text-xl font-extrabold tracking-tight select-none skew-x-6 origin-right">
          <span className="text-cyan-500">MegaMind</span>
          <span className="text-foreground">_X</span>
        </div>
      </div>

      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="w-full justify-between">
              <div className="flex items-center truncate">
                <StatusDot status={selected?.status} />
                <span className="truncate">{selected?.name || t.selectAgent}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>{t.agents}</span>
              <Button size="sm" variant="ghost" onClick={onRefresh}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-64 pr-1">
              {agents.map(ag => (
                <DropdownMenuItem key={ag.id} onClick={() => onSelectAgent(ag.id)} className="flex items-center justify-between gap-2">
                  <div className="flex items-center min-w-0">
                    <StatusDot status={ag.status} />
                    <span className="truncate">{ag.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize hidden sm:inline">{ag.status}</Badge>
                    <Switch checked={ag.enabled} onCheckedChange={(v) => onToggleAgent(ag.id, v)} />
                  </div>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3">
        <Button variant="outline" className="w-full" onClick={onRefresh}>
          <RefreshCcw className="w-4 h-4 mr-2" /> {t.refresh}
        </Button>
      </div>

      <div className="px-3 py-4 text-xs text-muted-foreground">
        <div className="mb-2">• {t.selectAgent}</div>
        <div>• {t.refresh}</div>
      </div>

      <div className="mt-auto p-3 border-t border-border text-xs text-muted-foreground">
        v0.1 mock UI
      </div>
    </aside>
  );
}