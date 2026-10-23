import type { ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RulebookDialogProps {
  title: string;
  icon: LucideIcon;
  summary: string;
  children: ReactNode;
}

export function RulebookDialog({ title, icon: Icon, summary, children }: RulebookDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start">
          <Icon aria-hidden="true" className="size-4" />{title}<ArrowUpRight aria-hidden="true" className="ml-auto size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-4 p-5">
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle className="flex items-center gap-2"><Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />{title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[65dvh]">
          <div className="space-y-4 pr-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
