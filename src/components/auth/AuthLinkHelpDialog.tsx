import { ExternalLink, Link2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SIGNUP_CHANNEL_ID = "1404037522065068042";
const DISCORD_INVITE_URL = "http://discord.gg/TDdhZgQyCR";

interface AuthLinkHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthLinkHelpDialog({
  open,
  onOpenChange,
}: AuthLinkHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Link your Discord first</DialogTitle>
          <DialogDescription>
            This Discord account is not connected to a tracked Lodestone
            character yet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Friends
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use <code className="font-mono text-foreground">/friend signup</code>{" "}
              in Discord channel{" "}
              <code className="font-mono text-foreground">
                {SIGNUP_CHANNEL_ID}
              </code>
              .
            </p>
          </section>

          <section className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              FC Members
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use <code className="font-mono text-foreground">/link</code> with
              your Lodestone character in Discord channel{" "}
              <code className="font-mono text-foreground">
                {SIGNUP_CHANNEL_ID}
              </code>
              .
            </p>
          </section>
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Open Discord
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
