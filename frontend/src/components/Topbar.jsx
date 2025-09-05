import React from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Moon, Sun, Globe2, Command, Radio, Eye, Settings } from "lucide-react";

export default function Topbar({ t, theme, setTheme, lang, setLang, adminLevel, setAdminLevel, panels, setPanels, onOpenCmd, glowMode, setGlowMode, connStatus, onOpenPreview, canOpenPreview = true, onOpenAdmin, customButtons = [] }) {
  const connColor = connStatus === 'open' ? 'bg-emerald-500' : connStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500';
  const showAdmin = typeof onOpenAdmin === 'function';
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b" data-testid="topbar">
      <div className="h-14 px-3 md:px-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${connColor}`} aria-label={`Connection ${connStatus}`}></span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{t.stream}: {connStatus}</span>
        </div>
        <div className="flex items-center gap-2">
          {customButtons.map(btn => (
            <Button key={btn.id} size="sm" variant="outline">{btn.label}</Button>
          ))}

          {canOpenPreview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={onOpenPreview} aria-label="Open preview">
                    <Eye className="w-4 h-4 mr-2" /> {t.preview}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.preview}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {showAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm" onClick={onOpenAdmin} aria-label="Admin settings">
                    <Settings className="w-4 h-4 mr-2" /> {t.admin}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.adminSettings}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.theme}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="w-[110px] h-8" aria-label="Language">
              <Globe2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Lang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">RU</SelectItem>
              <SelectItem value="en">EN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={glowMode} onValueChange={setGlowMode}>
            <SelectTrigger className="w-[140px] h-8" aria-label="Glow mode">
              <Radio className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Glow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soft">Мягкое</SelectItem>
              <SelectItem value="medium">Среднее</SelectItem>
              <SelectItem value="strong">Яркое</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden md:flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">{t.admin}</span>
            <div className="w-28"><Slider value={[adminLevel]} onValueChange={(v)=> setAdminLevel(v[0])} max={100} step={1} /></div>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2 hidden md:block" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="sm" onClick={onOpenCmd} aria-label="Command palette">
                  <Command className="w-4 h-4 mr-2" /> Cmd+K
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command palette</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}