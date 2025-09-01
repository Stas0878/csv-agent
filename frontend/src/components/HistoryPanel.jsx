import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

export default function HistoryPanel({ t, history = [], onLoad }) {
  return (
    <Card className="h-full bg-card/70 flex flex-col">
      <CardHeader className="pb-2 sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <CardTitle className="text-base">{t.history}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="divide-y">
            {history.map(item => (
              <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                  <div className="text-sm whitespace-pre-wrap break-words max-w-[68ch]">{item.content}</div>
                </div>
                <div className="shrink-0">
                  <Button size="sm" onClick={() => onLoad?.(item)}>{t.load}</Button>
                </div>
              </div>
            ))}
            {!history.length && (
              <div className="p-4 text-sm text-muted-foreground">{t.noHistory || 'История пуста'}</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}