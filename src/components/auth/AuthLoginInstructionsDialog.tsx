import { ExternalLink, LogIn } from "lucide-react";
import fcLinkCommandImage from "@/assets/instructions/fc-link-command.png";
import friendSignupCommandImage from "@/assets/instructions/friend-signup-command.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const BOT_CHANNEL_URL =
  "https://discord.com/channels/1336483731417989200/1404037522065068042";
const LODESTONE_URL = "https://na.finalfantasyxiv.com/lodestone";

interface AuthLoginInstructionsDialogProps {
  checking: boolean;
  open: boolean;
  onLogin: () => void;
  onOpenChange: (open: boolean) => void;
}

export function AuthLoginInstructionsDialog({
  checking,
  open,
  onLogin,
  onOpenChange,
}: AuthLoginInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl p-0">
        <ScrollArea className="max-h-[92vh]">
          <div className="grid gap-5 p-6">
            <DialogHeader>
              <DialogTitle>Get ready to log in</DialogTitle>
              <DialogDescription>
                You must be in the discord before authenticating.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              <p>
                To begin, head to{" "}
                <a
                  href={BOT_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  #bot-channel
                </a>{" "}
                and have your Lodestone ID ready.
              </p>
              <p className="mt-2">
                Open{" "}
                <a
                  href={LODESTONE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Lodestone
                </a>
                , click Character Profile in the top right, then copy the ID at
                the end of your profile URL.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
              <InstructionSection
                title="For FC Members"
                imageSrc={fcLinkCommandImage}
                imageAlt="Discord slash command for FC members to link a Lodestone character."
              />

              <Separator className="md:hidden" />
              <Separator
                orientation="vertical"
                className="hidden min-h-full md:block"
              />

              <InstructionSection
                title="For FC Friends"
                imageSrc={friendSignupCommandImage}
                imageAlt="Discord slash command for FC friends to sign up with a Lodestone character."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline">
                <a
                  href={LODESTONE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Lodestone
                </a>
              </Button>
              <Button type="button" onClick={onLogin} disabled={checking}>
                <LogIn className="h-4 w-4" />
                {checking ? "Checking Discord..." : "Login with Discord"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface InstructionSectionProps {
  imageAlt: string;
  imageSrc: string;
  title: string;
}

function InstructionSection({
  imageAlt,
  imageSrc,
  title,
}: InstructionSectionProps) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Run this command in{" "}
          <a
            href={BOT_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            #bot-channel
          </a>
          , then log in once you are done.
        </p>
      </div>
      <div className="rounded-lg border bg-background p-3">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-auto w-full rounded-md object-contain"
        />
      </div>
    </section>
  );
}
