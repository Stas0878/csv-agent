import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "./index.css";
import MegaSidebar from "./components/MegaSidebar";
import TerminalPanel from "./components/TerminalPanel";
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
import { Moon, Sun, Globe2, ShieldCheck, Database, Settings2, Command, Radio } from "lucide-react";
import { getAgents, refreshAgents, patchAgent, getHistory, createHistory } from "./lib/api";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { connectStream } from "./lib/stream";
import { AgentsSchema, HistorySchema } from "./lib/schema";

/* ... existing code unchanged above for useTheme, Topbar, AdminPanel, HistoryPanel ... */

// NOTE: Below is the Admin tab content integration

// Inside the TabsContent value="admin" section, we append ClientLogs under the grid

// The rest of App component remains same.