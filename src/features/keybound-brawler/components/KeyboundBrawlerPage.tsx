import { useMemo } from "react";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMembers } from "@/hooks/useMembers";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import type { Member } from "@/types";
import { useKeyboundScores } from "../hooks/useKeyboundScores";
import { useScoreEditor } from "../hooks/useScoreEditor";
import { rankMembers } from "../utils/scores";
import { RankingTable } from "./RankingTable";
import { ScorePodium } from "./ScorePodium";

function LeaderboardContent({
  members,
  leaderboard,
  canEdit,
  sessionToken,
}: {
  members: Record<string, Member>;
  leaderboard: ReturnType<typeof useKeyboundScores>;
  canEdit: boolean;
  sessionToken: string | null;
}) {
  const editor = useScoreEditor(canEdit, sessionToken, leaderboard.commit);
  const ranked = useMemo(
    () => rankMembers(members, leaderboard.data.scores),
    [members, leaderboard.data.scores],
  );

  return (
    <div className="@container mx-auto flex h-[calc(100dvh-7rem)] min-h-0 max-w-7xl flex-col gap-4 lg:pr-1 lg:pl-2">
      <header className="shrink-0">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-bold">
          <Gamepad2
            aria-hidden="true"
            className="h-7 w-7 shrink-0 text-amber-800 dark:text-primary"
          />
          Keybound Brawler
        </h1>
      </header>
      {leaderboard.loading ? (
        <div
          role="status"
          className="flex min-h-0 flex-1 flex-col gap-4"
          aria-label="Loading leaderboard"
        >
          <div className="h-44 shrink-0 animate-pulse rounded-lg bg-muted @[640px]:h-61" />
          <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-muted" />
          <span className="sr-only">Loading leaderboard...</span>
        </div>
      ) : leaderboard.error ? (
        <div className="rounded-lg border bg-card p-6">
          <p role="alert" className="mb-3 text-sm text-destructive">
            {leaderboard.error}
          </p>
          <Button variant="outline" onClick={leaderboard.retry}>
            Retry loading scores
          </Button>
        </div>
      ) : (
        <>
          <ScorePodium rows={ranked} />
          <section
            aria-labelledby="rankings-title"
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card dark:border-border/70 dark:bg-card/40"
          >
            <div className="shrink-0 px-3 py-3 @[640px]:px-6">
              <h2
                id="rankings-title"
                className="font-serif text-xl font-extrabold @[640px]:text-[1.75rem] @[640px]:leading-8"
              >
                wpm walters
              </h2>
            </div>
            {!ranked.some((row) => row.bestScore !== null) &&
              ranked.length > 0 && (
                <p className="shrink-0 px-3 pb-3 text-sm text-muted-foreground @[640px]:px-6">
                  No scores recorded yet.
                </p>
              )}
            <ScrollArea
              role="region"
              tabIndex={0}
              aria-label="Scrollable member rankings"
              className="min-h-0 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              onKeyDown={(event) => {
                if ((event.target as HTMLElement).closest("input, button"))
                  return;
                if (
                  ![
                    "ArrowUp",
                    "ArrowDown",
                    "PageUp",
                    "PageDown",
                    "Home",
                    "End",
                  ].includes(event.key)
                )
                  return;
                const viewport = event.currentTarget.querySelector<HTMLElement>(
                  "[data-radix-scroll-area-viewport]",
                );
                if (!viewport) return;
                event.preventDefault();
                if (event.key === "Home" || event.key === "End")
                  viewport.scrollTop =
                    event.key === "Home" ? 0 : viewport.scrollHeight;
                else
                  viewport.scrollBy({
                    top:
                      (event.key.endsWith("Up") ? -1 : 1) *
                      (event.key.startsWith("Page")
                        ? viewport.clientHeight
                        : 58),
                  });
              }}
            >
              <div className="[&>div]:overflow-visible">
                <RankingTable
                  rows={ranked}
                  editor={editor}
                  canEdit={canEdit && Boolean(sessionToken)}
                />
              </div>
            </ScrollArea>
          </section>
        </>
      )}
    </div>
  );
}

export function KeyboundBrawlerPage() {
  const members = useMembers();
  const auth = useAdminAuth();
  const leaderboard = useKeyboundScores();
  const canEdit =
    auth.authed && !auth.checking && auth.session?.isAdmin === true;
  const identity = `${auth.sessionToken ?? "guest"}:${auth.session?.discordUserId ?? ""}:${canEdit}`;
  return (
    <LeaderboardContent
      key={identity}
      members={members}
      leaderboard={leaderboard}
      canEdit={canEdit}
      sessionToken={auth.sessionToken}
    />
  );
}
