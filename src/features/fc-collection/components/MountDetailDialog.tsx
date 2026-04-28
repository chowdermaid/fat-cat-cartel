import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Mount } from "../types";

interface MountDetailDialogProps {
  mount: Mount;
  children: React.ReactNode;
}

export function MountDetailDialog({ mount, children }: MountDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">{mount.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mount.image && (
            <img
              src={mount.image}
              alt={mount.name}
              className="w-full rounded-lg border object-cover"
            />
          )}
          <div className="space-y-3 text-sm">
            {mount.description && (
              <p className="text-muted-foreground leading-relaxed">
                {mount.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Patch {mount.patch}</Badge>
              <Badge variant="secondary">{mount.movement}</Badge>
              <Badge variant="secondary">
                {mount.seats} seat{mount.seats !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">{mount.owned} own this</Badge>
            </div>
            {mount.sources.length > 0 && (
              <div>
                <p className="font-semibold mb-1.5">Sources</p>
                <ul className="space-y-1 text-muted-foreground">
                  {mount.sources.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="text-primary shrink-0 mt-0.5">✦</span>
                      <span>
                        <span className="font-medium text-foreground">
                          {s.type}
                        </span>
                        {s.text ? ` — ${s.text}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
