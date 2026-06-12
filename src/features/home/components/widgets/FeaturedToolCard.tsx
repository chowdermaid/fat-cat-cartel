import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HOME_FEATURED_TOOLS } from "../../constants";
import { selectDailyFeaturedTool } from "../../utils/dailySelection";
import { ClassifiedLink } from "../newspaper/ClassifiedLink";
import { ClippingCard } from "../newspaper/ClippingCard";

export function FeaturedToolCard() {
  const featuredTool = selectDailyFeaturedTool();
  const FeaturedIcon = featuredTool.icon;
  const quickTools = HOME_FEATURED_TOOLS.filter(
    (tool) => tool.to !== featuredTool.to,
  );

  return (
    <ClippingCard className="gazette-reveal border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <FeaturedIcon className="h-4 w-4 text-primary" />
          Public Service Notice
        </CardTitle>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Tool of the moment
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{featuredTool.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {featuredTool.description}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to={featuredTool.to}>
            {featuredTool.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Separator />
        <div>
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Classifieds
          </p>
          <div className="grid gap-2">
            {quickTools.slice(0, 3).map(({ to, label, icon, description }) => (
              <ClassifiedLink
                key={to}
                description={description}
                icon={icon}
                label={label}
                to={to}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </ClippingCard>
  );
}
