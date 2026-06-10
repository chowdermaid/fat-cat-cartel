import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingBoard() {
  return (
    <div className="grid gap-5 xl:grid-cols-[3fr_3fr_1fr]">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="crafting-section space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          {Array.from({ length: 2 }).map((__, cardIndex) => (
            <Card key={cardIndex}>
              <CardHeader>
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
