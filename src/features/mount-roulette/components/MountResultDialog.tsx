import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Collectible, MemberWithMounts } from "@/features/fc-collection/types";

interface MountResultDialogProps {
  mount: Collectible | null;
  members: MemberWithMounts[];
  showFriendBadges?: boolean;
  open: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
}

export function MountResultDialog({
  mount,
  members,
  showFriendBadges = false,
  open,
  onClose,
  onSpinAgain,
}: MountResultDialogProps) {
  const missing = mount ? members.filter((m) => !m.owned.mounts.has(mount.id)) : [];
  const owners = mount ? members.filter((m) => m.owned.mounts.has(mount.id)) : [];

  const sourceLabel = mount?.sources?.[0]?.text || mount?.sources?.[0]?.type || null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{mount?.name}</DialogTitle>
        </DialogHeader>
        {mount && (
          <div className="space-y-3">
            {mount.image && (
              <img
                src={mount.image}
                alt={mount.name}
                className="h-20 mx-auto rounded-lg border object-contain"
              />
            )}
            {sourceLabel && (
              <p className="text-xs text-center text-muted-foreground">{sourceLabel}</p>
            )}

            <ScrollArea className="h-52">
              <div className="grid grid-cols-2 gap-4 text-sm pr-3">
                <div>
                  <p className="font-semibold mb-2 text-muted-foreground">Needs this</p>
                  {missing.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Everyone has it</p>
                  ) : (
                    missing.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 py-0.5">
                        {m.avatar && (
                          <img src={m.avatar} alt="" className="h-5 w-5 rounded-full shrink-0" />
                        )}
                        <span className="truncate">{m.name}</span>
                        {showFriendBadges && m.isFriend && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                            Friend
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <p className="font-semibold mb-2 text-muted-foreground">Already has it</p>
                  {owners.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nobody has it</p>
                  ) : (
                    owners.map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5 py-0.5">
                        {m.avatar && (
                          <img src={m.avatar} alt="" className="h-5 w-5 rounded-full shrink-0" />
                        )}
                        <span className="truncate">{m.name}</span>
                        {showFriendBadges && m.isFriend && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                            Friend
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>

            <Button className="w-full" onClick={onSpinAgain}>
              Spin Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
