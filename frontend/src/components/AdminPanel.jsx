import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export default function AdminPanel({ t, adminLevel }) {
  return (
    <Card className="bg-card/70">
      <CardHeader className="pb-2 sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <CardTitle className="text-base">{t.admin}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">Admin level: {adminLevel}</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary">{t.refresh}</Button>
          <Button size="sm" variant="outline">{t.save}</Button>
        </div>
      </CardContent>
    </Card>
  );
}