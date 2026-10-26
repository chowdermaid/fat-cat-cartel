import { Portal as TooltipPortal } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRulebookScroll } from "../../hooks/useRulebookScroll";
import { chapters } from "../../presentation";
import { BoardMoods } from "./BoardMoods";
import { BoardOverview } from "./BoardOverview";
import { Rewards } from "./Rewards";
import { QuickStart } from "./QuickStart";
import { TilesMovement } from "./TilesMovement";

const chapterContent = {
  "quick-start": <QuickStart />,
  "special-tiles": <TilesMovement />,
  "board-moods": <BoardMoods />,
  rewards: <Rewards />,
};

export function RulebookView({ active }: { active: boolean }) {
  const { scrollAreaRef, contentRef, activeChapter, navigateToChapter } =
    useRulebookScroll(active);
  const content = {
    ...chapterContent,
    "board-overview": <BoardOverview active={active} />,
  };

  return (
    <div className="grid h-full w-full min-h-0 min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-x-2 @[640px]:grid-cols-[180px_minmax(0,1fr)] @[640px]:gap-x-4 @[1050px]:grid-cols-[220px_minmax(0,1fr)] @[1050px]:gap-x-6">
      <ScrollArea
        className="h-full border-r"
        viewportClassName="overscroll-contain"
      >
        <TooltipProvider delayDuration={200}>
          <nav
            aria-label="Rulebook chapters"
            className="flex flex-col gap-1 pl-2 pr-1 py-2"
          >
            {chapters.map(({ id, title, icon: Icon }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    className={`h-auto min-h-11 w-full justify-center rounded-l-none border-l-[3px] px-1 py-2 text-left text-sm font-semibold whitespace-normal @[640px]:justify-start @[640px]:gap-2 ${activeChapter === id ? "border-primary bg-primary/10 text-amber-800 dark:border-[#ffd331] dark:text-[#ffd331]" : "border-transparent text-muted-foreground"}`}
                  >
                    <a
                      data-event-reveal
                      href={`#rulebook-${id}`}
                      aria-current={
                        activeChapter === id ? "location" : undefined
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        navigateToChapter(id);
                      }}
                    >
                      <Icon aria-hidden="true" className="size-6 shrink-0" />
                      <span className="sr-only @[640px]:not-sr-only">
                        {title}
                      </span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent side="right">{title}</TooltipContent>
                </TooltipPortal>
              </Tooltip>
            ))}
          </nav>
        </TooltipProvider>
      </ScrollArea>
      <ScrollArea
        ref={scrollAreaRef}
        className="h-full"
        viewportClassName="overscroll-contain [&>div]:!block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div
          ref={contentRef}
          className="min-w-0 space-y-10 pl-2 pr-2 pt-4 pb-8 @[640px]:pr-5 [&_h2]:focus-visible:outline-none [&_h2]:focus-visible:ring-2 [&_h2]:focus-visible:ring-ring"
        >
          {chapters.map(({ id }) => (
            <div
              key={id}
              id={`rulebook-${id}`}
              data-rulebook-chapter={id}
              data-event-reveal
              className="min-w-0 border-t pt-8 first:border-t-0 first:pt-0 last:min-h-[calc(var(--rulebook-viewport-height,0px)-1rem)]"
            >
              {content[id]}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
