import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

const instructionImages = Object.entries(
  import.meta.glob("../../../assets/hidenseek/*", {
    eager: true,
    import: "default",
  }) as Record<string, string>,
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);

export function HideAndSeekDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <BookOpen className="h-3.5 w-3.5" />
          Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Hide &amp; Seek Rules</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] px-6 pb-6 mt-4">
          <div className="space-y-6 text-sm">
            {/* Format */}
            <div className="space-y-1">
              <p>
                <span className="font-semibold">Rounds:</span> 3
              </p>
              <p className="text-muted-foreground">
                A different admin acts as the initial seeker each round. All
                participants are invited into an alliance before the game begins
                for easy communication.
              </p>
            </div>

            {/* How it works */}
            <div>
              <p className="font-semibold mb-2">How it works</p>
              <ul className="space-y-1.5 text-muted-foreground">
                {[
                  "Everyone begins as a hider, spread out within the designated area.",
                  "If a seeker tags you, they must /pet you to confirm the tag.",
                  'Once tagged, type "tagged" in alliance chat to acknowledge it, then join the seekers for the remainder of the round.',
                  "Seekers work together to find all remaining hiders.",
                ].map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">✦</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Golden Chickens */}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="font-semibold">Golden Chickens 🐔</p>
              <p className="text-muted-foreground">
                Chow, Potato, Zalka, and Axo will be dressed as Golden Chickens
                and act as special hiders. Tagging a Golden Chicken is the{" "}
                <span className="font-semibold text-foreground">only way</span>{" "}
                for seekers to earn points. Each tag is worth{" "}
                <span className="font-semibold text-foreground">+2 points</span>
                !
              </p>
            </div>

            {/* Scoring */}
            <div>
              <p className="font-semibold mb-3">Scoring</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Seeker Points
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tag a Golden Chicken
                    </span>
                    <span className="font-semibold">2 pts</span>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hider Points
                  </p>
                  {[
                    { label: "Last hider found", pts: "5 pts" },
                    { label: "2nd last hider found", pts: "3 pts" },
                    { label: "3rd last hider found", pts: "2 pts" },
                  ].map(({ label, pts }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Photo instructions */}
            {instructionImages.length > 0 && (
              <div>
                <p className="font-semibold mb-3">Settings Instructions</p>
                <div className="space-y-3">
                  {instructionImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Setup instruction ${i + 1}`}
                      className="w-full rounded-lg border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
