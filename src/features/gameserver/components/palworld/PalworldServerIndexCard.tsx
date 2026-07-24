import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Gamepad2,
  MapPin,
  Wifi,
} from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import palworldBanner from "@/assets/gameserver/palworld-banner.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GameServerStatus, GameServersResponse } from "../../types";

type PalworldServerIndexCardProps = {
  server: GameServersResponse["servers"][number];
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function statusPresentation(status: GameServerStatus): {
  indicator: string;
  label: string;
  message: string;
  tone: string;
} {
  if (status === "running") {
    return {
      indicator: "bg-emerald-300",
      label: "Online",
      message: "Ready to join",
      tone: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    };
  }
  if (status === "pending") {
    return {
      indicator: "bg-amber-300",
      label: "Starting",
      message: "The server is starting",
      tone: "border-amber-300/30 bg-amber-400/15 text-amber-100",
    };
  }
  if (status === "stopping" || status === "shutting-down") {
    return {
      indicator: "bg-amber-300",
      label: "Stopping",
      message: "The server is stopping",
      tone: "border-amber-300/30 bg-amber-400/15 text-amber-100",
    };
  }
  if (status === "terminated" || status === "unavailable") {
    return {
      indicator: "bg-red-300",
      label: "Attention",
      message: "Check the server dashboard",
      tone: "border-red-300/30 bg-red-400/15 text-red-100",
    };
  }
  if (status === "disabled") {
    return {
      indicator: "bg-slate-300",
      label: "Disabled",
      message: "Server controls are disabled",
      tone: "border-white/20 bg-white/10 text-slate-100",
    };
  }
  return {
    indicator: "bg-slate-300",
    label: status === "stopped" ? "Offline" : "Unknown",
    message:
      status === "stopped"
        ? "Available to start"
        : "Status is currently unavailable",
    tone: "border-white/20 bg-white/10 text-slate-100",
  };
}

export function PalworldServerIndexCard({
  server,
}: PalworldServerIndexCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstHoverEffectRef = useRef(true);
  const [hovered, setHovered] = useState(false);
  const presentation = statusPresentation(server.status);
  const addressReady =
    server.status === "running" && Boolean(server.connectAddress);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-index-reveal", {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: stagger(65),
        duration: 480,
        ease: "out(4)",
      });
      animate(".pw-index-art", {
        opacity: [0, 1],
        scale: [1.045, 1],
        duration: 720,
        ease: "out(4)",
      });
    });
    return () => scope.revert();
  }, []);

  useEffect(() => {
    if (firstHoverEffectRef.current) {
      firstHoverEffectRef.current = false;
      return;
    }
    if (!rootRef.current || prefersReducedMotion()) return;
    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-index-art", {
        scale: hovered ? 1.035 : 1,
        translateX: hovered ? 4 : 0,
        duration: 420,
        ease: "out(4)",
      });
      animate(".pw-index-card-body", {
        translateY: hovered ? -3 : 0,
        duration: 320,
        ease: "out(4)",
      });
    });
    return () => scope.revert();
  }, [hovered]);

  return (
    <Card
      ref={rootRef}
      className="overflow-hidden"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
    >
      <div className="relative isolate h-48 overflow-hidden bg-slate-950 text-white">
        <img
          src={palworldBanner}
          alt=""
          aria-hidden="true"
          className="pw-index-art absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.93)_0%,rgba(2,6,23,0.68)_55%,rgba(2,6,23,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(2,6,23,0.8)_0%,transparent_65%)]" />

        <div className="relative flex h-full flex-col justify-between p-5">
          <Badge
            variant="outline"
            className={`pw-index-reveal w-fit gap-2 ${presentation.tone}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${presentation.indicator}`}
            />
            {presentation.label}
          </Badge>

          <div className="pw-index-reveal">
            <p className="text-xs font-medium text-slate-300">
              jeff bezos simulator
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-serif text-2xl font-bold">
              <Gamepad2 className="h-5 w-5 text-cyan-200" />
              {server.name}
            </h2>
            <p className="mt-1 text-sm text-slate-200">
              {server.disabledMessage || presentation.message}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="pw-index-card-body space-y-4 pt-5">
        <p className="pw-index-reveal text-sm text-muted-foreground">
          {server.description}
        </p>

        <div className="pw-index-reveal grid gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Region</div>
              <div className="truncate font-medium">{server.region}</div>
            </div>
          </div>
        </div>

        <div className="pw-index-reveal flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <Wifi
            className={`h-4 w-4 shrink-0 ${
              addressReady ? "text-emerald-600" : "text-muted-foreground"
            }`}
          />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Connection</div>
            <div className="truncate font-mono text-xs font-medium">
              {addressReady
                ? server.connectAddress
                : server.status === "stopped"
                  ? "Start the server to connect"
                  : "Not available yet"}
            </div>
          </div>
        </div>

        <Button asChild className="pw-index-reveal w-full">
          <Link to={server.route}>
            Open server
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
