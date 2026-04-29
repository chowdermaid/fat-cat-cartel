import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Collectible, Mount } from "../types";

interface CollectibleDetailDialogProps {
  item: Collectible;
  children: React.ReactNode;
}

function isMount(item: Collectible): item is Mount {
  return "seats" in item;
}

export function CollectibleDetailDialog({ item, children }: CollectibleDetailDialogProps) {
  const mount = isMount(item) ? item : null;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {(item.image) && (
            <img
              src={item.image}
              alt={item.name}
              className="w-full rounded-lg border object-cover"
            />
          )}
          <div className="space-y-3 text-sm">
            {item.description && (
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Patch {item.patch}</Badge>
              {mount && (
                <>
                  <Badge variant="secondary">{mount.movement}</Badge>
                  <Badge variant="secondary">
                    {mount.seats} seat{mount.seats !== 1 ? "s" : ""}
                  </Badge>
                </>
              )}
              <Badge variant="secondary">{item.owned} own this</Badge>
            </div>
            {(item.sources?.length ?? 0) > 0 && (
              <div>
                <p className="font-semibold mb-1.5">Sources</p>
                <ul className="space-y-1 text-muted-foreground">
                  {item.sources!.map((s, i) => (
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
