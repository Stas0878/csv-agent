import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { Activity, CheckCircle2, CircleOff, Cpu, Radio } from "lucide-react";
import { api } from "../lib/api";

const Stat = ({ icon: Icon, label, value, tint = "text-cyan-500" }) => (
  <Card className="bg-card/70 overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("text-xs text-muted-foreground")}>{label}</div>
        <Icon className={cn("w-4 h-4", tint)} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [m, setM] = useState({ agents: 0, enabled: 0, status: { online: 0, broken: 0, idle: 0 }, outputs24h: 0 });
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/metrics");
        if (mounted) setM(data);
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Stat icon={Cpu} label="Agents" value={m.agents} />
      <Stat icon={CheckCircle2} label="Online" value={m.status.online} />
      <Stat icon={CircleOff} label="Idle" value={m.status.idle} />
      <Stat icon={Radio} label="Enabled" value={m.enabled} />
      <Stat icon={Activity} label="Outputs 24h" value={m.outputs24h} />
    </div>
  );
}