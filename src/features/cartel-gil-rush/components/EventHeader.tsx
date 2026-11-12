import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, MapPin, Users } from "lucide-react";
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
    <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b px-5 pt-4">
      <div className="flex min-w-0 flex-1 basis-full items-center gap-4 @[900px]:basis-0">
        <img src={fatcathi} alt="" className="size-12 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">The Meowfia</p>
          <h1 className="font-serif text-[26px] leading-tight font-extrabold @[1100px]:text-[32px]">Cartel Gil Rush</h1>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span>Empyreum · Ward 21, Plot 22</span></p>
        </div>
      </div>
      <TabsList aria-label="Event views" className="order-3 flex w-full justify-start gap-1 @[600px]:gap-3">
        <TabsTrigger value="game" className="min-h-14 min-w-0 flex-1 gap-1.5 px-2 text-sm @[600px]:flex-none @[600px]:gap-3 @[600px]:px-[22px] @[600px]:text-base dark:data-[state=active]:border-[#ffd331] dark:data-[state=active]:text-[#ffd331]"><Users aria-hidden="true" className="size-5" />Game</TabsTrigger>
        <TabsTrigger value="rulebook" className="min-h-14 min-w-0 flex-1 gap-1.5 px-2 text-sm @[600px]:flex-none @[600px]:gap-3 @[600px]:px-[22px] @[600px]:text-base dark:data-[state=active]:border-[#ffd331] dark:data-[state=active]:text-[#ffd331]"><BookOpen aria-hidden="true" className="size-5" />Rulebook</TabsTrigger>
      </TabsList>
      <div className="ml-auto flex min-h-11 min-w-0 basis-full items-center justify-end @[900px]:basis-auto">
        <div className={view === "game" ? "min-w-0" : "hidden"}>{children}</div>
        {view === "rulebook" && <Button variant="ghost" className="min-h-11 whitespace-normal text-muted-foreground" onClick={onBackToGame}><ArrowLeft aria-hidden="true" className="size-4" />Back to game</Button>}
      </div>
    </header>
  );
}
