import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { api } from "../lib/api";
import { Search, Filter, X, Download, RefreshCw } from "lucide-react";

export default function ClientLogs() {
  const [level, setLevel] = useState("all");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("all");
  const [showStack, setShowStack] = useState(true);
  const [limit, setLimit] = useState(100);

  const fetchLogs = async (lvl, query) => {
    setLoading(true);
    try {
      const params = { limit };
      if (lvl !== "all") params.level = lvl;
      if (query) params.q = query;
      if (dateRange !== "all") {
        const now = new Date();
        switch (dateRange) {
          case "1h":
            params.since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            break;
          case "24h":
            params.since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case "7d":
            params.since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }
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
  }, [level, q, dateRange, limit]);

  const clearFilters = () => {
    setLevel("all");
    setQ("");
    setDateRange("all");
  };

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Time,Level,Message\n" +
      logs.map(l => `"${new Date(l.createdAt).toISOString()}","${l.level}","${l.message.replace(/"/g, '""')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `client_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (q && !log.message.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [logs, q]);

  const hasActiveFilters = level !== "all" || q !== "" || dateRange !== "all";

  return (
    <Card className="bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="w-4 h-4" />
          Client Logs
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {filteredLogs.length} filtered
            </Badge>
          )}
        </CardTitle>
        
        {/* Enhanced Filter Row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">🔴 Error</SelectItem>
              <SelectItem value="warn">🟡 Warn</SelectItem>
              <SelectItem value="info">🔵 Info</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="500">500</SelectItem>
              <SelectItem value="1000">1000</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-2 top-2 text-muted-foreground" />
            <Input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search messages, stack traces..." 
              className="h-8 pl-8 pr-8" 
            />
            {q && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => setQ("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchLogs(level, q)} 
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-muted-foreground"
            >
              <Filter className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            disabled={!logs.length}
            className="h-8"
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>

        {/* Toggle for stack traces */}
        <div className="flex items-center gap-2 mt-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input 
              type="checkbox" 
              checked={showStack} 
              onChange={(e) => setShowStack(e.target.checked)}
              className="w-3 h-3"
            />
            Show stack traces
          </label>
          <span className="text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
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
              {filteredLogs.map((l) => (
                <TableRow key={l.id} className="align-top">
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        l.level === 'error' ? 'border-rose-400 text-rose-400' :
                        l.level === 'warn' ? 'border-amber-400 text-amber-400' : 
                        'border-cyan-400 text-cyan-400'
                      }`}
                    >
                      {l.level || 'error'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {/* Highlight search terms */}
                      {q ? (
                        l.message.split(new RegExp(`(${q})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === q.toLowerCase() ? 
                            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                              {part}
                            </mark> : part
                        )
                      ) : l.message}
                    </div>
                    {showStack && l.stack && (
                      <details className="mt-1">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Stack trace
                        </summary>
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">
                          {l.stack.slice(0, 2000)}
                          {l.stack.length > 2000 && "..."}
                        </div>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!filteredLogs.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading logs...
                      </div>
                    ) : hasActiveFilters ? (
                      <div className="space-y-2">
                        <div>No logs match your filters</div>
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      'No logs available'
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}