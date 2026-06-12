import { Link } from "@tanstack/react-router";
import { ArrowRight, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <CardContent className="space-y-3 text-sm text-muted-foreground">
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
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="http://discord.gg/TDdhZgQyCR"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jointhemeowfia">Join</Link>
          </Button>
        </div>
      </CardContent>
    </ClippingCard>
  );
}
