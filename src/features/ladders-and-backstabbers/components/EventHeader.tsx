import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Users } from "lucide-react";
import fatcathi from "@/assets/fatcathi.png";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventView } from "../types";

interface EventHeaderProps {
  view: EventView;
  onBackToGame: () => void;
  children: ReactNode;
}

export function EventHeader({ view, onBackToGame, children }: EventHeaderProps) {
  return (
    <header className="space-y-3 border-b">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-[360px] items-center gap-3">
          <img src={fatcathi} alt="" className="size-11 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">The Meowfia</p>
            <h1 className="font-serif text-[28px] leading-tight font-bold @[1100px]:text-[32px]">Ladders &amp; Backstabbers</h1>
            <p className="mt-1 text-xs font-semibold tracking-widest text-muted-foreground">DRAFT</p>
          </div>
        </div>
        <div className={view === "game" ? "w-full min-w-0 @[900px]:w-auto" : "hidden"}>{children}</div>
        {view === "rulebook" && <Button variant="ghost" className="min-h-11 whitespace-normal text-muted-foreground" onClick={onBackToGame}><ArrowLeft aria-hidden="true" className="size-4" />Back to game</Button>}
      </div>
      <TabsList aria-label="Event views" className="flex w-full justify-start gap-5">
        <TabsTrigger value="game"><Users aria-hidden="true" className="size-5" />Game</TabsTrigger>
        <TabsTrigger value="rulebook"><BookOpen aria-hidden="true" className="size-5" />Rulebook</TabsTrigger>
      </TabsList>
    </header>
  );
}
