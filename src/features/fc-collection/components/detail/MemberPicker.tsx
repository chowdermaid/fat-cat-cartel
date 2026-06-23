import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
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
          <Users className="h-4 w-4" />
          {isFiltered ? `${visibleCount} / ${members.length} members` : "Members"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Members</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Select all
          </button>
          <span className="text-xs text-muted-foreground">·</span>
          <button
            onClick={clearAll}
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>

        <ScrollArea className="h-72" viewportClassName="h-72">
          <div className="flex flex-wrap gap-2 pr-3">
            {members.map((m) => {
              const checked = draft.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={cn(
                    "cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm transition-colors",
                    checked
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-background border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  <img src={m.avatar} alt="" className="h-6 w-6 rounded-full shrink-0 object-cover" />
                  <span className="whitespace-nowrap">{m.name}</span>
                  {showFriendBadges && m.isFriend && (
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                      Friend
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-2 border-t">
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
