import React from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { ChevronDown, RefreshCcw, PanelRight } from "lucide-react";
import BrandLogo from "./BrandLogo";

const StatusDot = ({ status }) => {
  const color = status === "online" ? "bg-emerald-500" : status === "broken" ? "bg-rose-500" : "bg-zinc-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} mr-2`} />;
};

export default function RightSidebar({ t, agents, selectedAgentId, onSelectAgent, onToggleAgent, onRefresh, glowMode = "strong", onCollapse }) {
  const selected = agents.find(a => a.id === selectedAgentId) || agents[0];

  return (
    <aside className="h-full w-72 min-w-[260px] max-w-[320px] bg-card/60 backdrop-blur-sm flex flex-col border-l border-border">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={onCollapse} title="Collapse">
          <PanelRight className="w-4 h-4" />
        </Button>
        <BrandLogo glowMode={glowMode} />
      </div>

      <div className="px-3 py-3 min-h-0">
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
          <DropdownMenuContent align="end" className="w-72">
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
                    {ag.ai && <Badge className="ml-2" variant="secondary">AI</Badge>}
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

      <div className="mt-auto p-3 border-t border-border text-xs text-muted-foreground">v0.2 UI</div>
    </aside>
  );
}