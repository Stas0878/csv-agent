import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { Activity, CheckCircle2, CircleOff, Cpu, Radio } from "lucide-react";
import { api } from "../lib/api";
import { Skeleton } from "./ui/skeleton";

const Stat = ({ icon: Icon, label, value, tint = "text-cyan-500", loading = false }) => (
  <Card className="bg-card/70 overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("text-xs text-muted-foreground")}>{label}</div>
        <Icon className={cn("w-4 h-4", tint)} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">
        {loading ? <Skeleton className="h-6 w-12" /> : value}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/metrics");
        if (mounted) setM(data);
      } catch (e) { /* ignore */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const metrics = m || { agents: 0, enabled: 0, status: { online: 0, broken: 0, idle: 0 }, outputs24h: 0 };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Stat icon={Cpu} label="Agents" value={metrics.agents} loading={loading} />
      <Stat icon={CheckCircle2} label="Online" value={metrics.status.online} loading={loading} />
      <Stat icon={CircleOff} label="Idle" value={metrics.status.idle} loading={loading} />
      <Stat icon={Radio} label="Enabled" value={metrics.enabled} loading={loading} />
      <Stat icon={Activity} label="Outputs 24h" value={metrics.outputs24h} loading={loading} />
    </div>
  );
}