import { useState } from "react";
import { Check, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MemberWithMounts } from "../../types";

interface MemberPickerProps {
  members: MemberWithMounts[];
  selected: Set<string>;
  onChange: (ids: Set<string>) => void;
  defaultToAll?: boolean;
  showFriendBadges?: boolean;
}

export function MemberPicker({
  members,
  selected,
  onChange,
  defaultToAll = true,
  showFriendBadges = false,
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      const fallback = defaultToAll ? new Set(members.map((m) => m.id)) : new Set<string>();
      setDraft(selected.size === 0 ? fallback : new Set(selected));
    }
    setOpen(isOpen);
  }

  function toggleMember(id: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setDraft(new Set(members.map((m) => m.id)));
  }

  function clearAll() {
    setDraft(new Set());
  }

  function apply() {
    onChange(draft.size === members.length ? new Set() : draft);
    setOpen(false);
  }

  const selectedInScope = [...selected].filter((id) =>
    members.some((member) => member.id === id),
  ).length;
  const isFiltered = selected.size > 0;
  const visibleCount = isFiltered ? selectedInScope : members.length;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isFiltered ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Users aria-hidden="true" className="h-4 w-4" />
          {isFiltered ? `${visibleCount} / ${members.length} members` : "Members"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg gap-3">
        <DialogHeader>
          <DialogTitle>Filter Members</DialogTitle>
          <DialogDescription>Choose members, then Apply to update your selection.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm"
            onClick={selectAll}
          >
            Select all
          </Button>
          <Button variant="ghost" size="sm"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </div>

        <ScrollArea className="h-[min(18rem,40dvh)]" viewportClassName="h-full [&>div]:!block">
          <div className="grid min-w-0 grid-cols-1 gap-2 pr-3 sm:grid-cols-2">
            {members.map((m) => {
              const checked = draft.has(m.id);
              return (
                <Button variant="outline"
                  aria-pressed={checked}
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={cn(
                    "h-auto min-h-10 min-w-0 justify-start whitespace-normal px-2.5 py-2 text-left text-sm",
                    checked
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  <Avatar aria-hidden="true" className="h-6 w-6">
                    <AvatarImage src={m.avatar || undefined} alt="" />
                    <AvatarFallback className="text-xs">{m.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{m.name}</span>
                  {checked && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                  {showFriendBadges && m.isFriend && (
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                      Friend
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {draft.size} of {members.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
