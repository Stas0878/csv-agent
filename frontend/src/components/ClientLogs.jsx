import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { api } from "../lib/api";

export default function ClientLogs() {
  const [level, setLevel] = useState("all");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (lvl, query) => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (lvl !== "all") params.level = lvl;
      if (query) params.q = query;
      const { data } = await api.get("/logs", { params });
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(level, q); }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(level, q), 400);
    return () => clearTimeout(t);
  }, [level, q]);

  return (
    <Card className="bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Client Logs</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search message..." className="h-8 max-w-xs" />
          <Button variant="secondary" size="sm" onClick={() => fetchLogs(level, q)} disabled={loading}>Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Time</TableHead>
                <TableHead className="w-[80px]">Level</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded border ${l.level==='error'?'border-rose-400 text-rose-400':l.level==='warn'?'border-amber-400 text-amber-400':'border-cyan-400 text-cyan-400'}`}>{l.level||'error'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm whitespace-pre-wrap break-words">{l.message}</div>
                    {l.stack ? <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{l.stack.slice(0, 1000)}</div> : null}
                  </TableCell>
                </TableRow>
              ))}
              {!logs.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">{loading ? 'Loading…' : 'No logs'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}