import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Shield, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import dragonwildsBanner from "@/assets/gameserver/runescape-banner.jpg";
import type { GameServersResponse } from "../../types";
import { dragonwildsStatusLabel } from "../../utils/dragonwilds";

export function DragonwildsServerIndexCard({ server }: { server: GameServersResponse["servers"][number] }) {
  return <Card className="overflow-hidden">
    <div className="relative isolate flex h-48 flex-col justify-between overflow-hidden border-b bg-slate-950 p-5 text-white">
      <img
        src={dragonwildsBanner}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.93)_0%,rgba(2,6,23,0.68)_55%,rgba(2,6,23,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,6,23,0.8)_0%,transparent_65%)]" />
      <Badge variant="outline" className="relative w-fit border-emerald-300/30 bg-emerald-400/15 text-emerald-50">{dragonwildsStatusLabel(server.enabled === false ? "disabled" : server.status)}</Badge>
      <div className="relative"><h2 className="flex items-center gap-2 font-serif text-2xl font-bold"><Sprout className="h-6 w-6 text-emerald-300" />Dragonwilds</h2><p className="mt-1 text-sm text-slate-200">RuneScape: Dragonwilds</p></div>
    </div>
    <CardContent className="flex flex-1 flex-col gap-4 pt-5">
      <p className="text-sm text-muted-foreground">{server.description}</p>
      <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{server.region}</p>
      <p className="flex items-start gap-2 text-sm"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{server.disabledMessage || (server.status === "running" ? "Host running; game readiness unverified." : "View host status and manual controls.")}</span></p>
      <Button asChild className="mt-auto w-full"><Link to="/gameserver/dragonwilds">Open Dragonwilds<ArrowUpRight className="h-4 w-4" /></Link></Button>
    </CardContent>
  </Card>;
}
