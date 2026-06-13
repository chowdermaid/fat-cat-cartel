import { Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HOME_HOUSE_DETAILS } from "../../constants";
import { ClippingCard } from "../newspaper/ClippingCard";

export function FcHangoutCard() {
  return (
    <ClippingCard className="gazette-reveal" rotate="left">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <MapPin className="h-4 w-4 text-primary" />
          Local Address
        </CardTitle>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Ward report
        </p>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <div className="rounded-md border bg-background/70 p-3">
          <Badge variant="secondary" className="mb-3">
            {HOME_HOUSE_DETAILS.badge}
          </Badge>
          <p className="flex items-start gap-2 font-medium text-foreground">
            <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {HOME_HOUSE_DETAILS.address}
          </p>
          <p className="mt-2">{HOME_HOUSE_DETAILS.description}</p>
        </div>
      </CardContent>
    </ClippingCard>
  );
}
