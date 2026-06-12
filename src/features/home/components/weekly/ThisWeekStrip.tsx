import type { ElementType } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Hammer, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HOME_STATIC_WEEK_ITEMS } from "../../constants";
import type { HomeOpenErrandSummary } from "../../types";
import { getInitials } from "../../utils/dailySelection";
import { NewspaperSectionLabel } from "../newspaper/NewspaperSectionLabel";

function WeekTile({
  descriptionClassName = "",
  description,
  icon: Icon,
  label,
  loading,
  tileClassName = "",
  titleClassName = "",
  title,
  to,
}: {
  descriptionClassName?: string;
  description: string;
  icon: ElementType;
  label: string;
  loading?: boolean;
  tileClassName?: string;
  titleClassName?: string;
  title: string;
  to?: string;
}) {
  const content = (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <p
            className={[
              "text-sm font-medium leading-snug",
              titleClassName,
            ].join(" ")}
          >
            {title}
          </p>
          <p
            className={[
              "mt-1 text-xs leading-snug text-muted-foreground",
              descriptionClassName,
            ].join(" ")}
          >
            {description}
          </p>
        </>
      )}
    </>
  );

  const className = [
    "gazette-clipping group relative rounded-lg border border-dashed bg-card/85 p-3 shadow-sm transition-colors hover:border-primary/40",
    tileClassName,
  ].join(" ");

  if (!to) {
    return (
      <div className={className}>
        <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className={className}>
      <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
      {content}
      <ArrowRight className="mt-2 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function AvatarStack({
  people,
}: {
  people: { name: string; avatarUrl: string | null }[];
}) {
  if (people.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      {people.slice(0, 2).map((person) =>
        person.avatarUrl ? (
          <img
            key={person.name}
            src={person.avatarUrl}
            alt={person.name}
            className="h-7 w-7 rounded-full border object-cover"
          />
        ) : (
          <div
            key={person.name}
            className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted text-[0.65rem] font-semibold text-muted-foreground"
          >
            {getInitials(person.name)}
          </div>
        ),
      )}
    </div>
  );
}

function BirthdayWeekTile({
  people,
  text,
  loading,
}: {
  people: { name: string; avatarUrl: string | null }[];
  text: string;
  loading: boolean;
}) {
  return (
    <Link
      to="/calendar"
      className="gazette-clipping group relative rounded-lg border border-dashed bg-card/85 p-3 shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Star className="h-3.5 w-3.5" />
        Birthday Watch
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <p className="text-sm font-medium leading-snug">{text}</p>
          <AvatarStack people={people} />
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {people.length > 0
              ? "Today through the next 7 days."
              : "No cake-related incidents forecast."}
          </p>
        </>
      )}
      <ArrowRight className="mt-2 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function OpenErrandTile({
  errand,
  loading,
}: {
  errand: HomeOpenErrandSummary | null;
  loading: boolean;
}) {
  return (
    <Link
      to="/craftingboard"
      className="gazette-clipping group relative rounded-lg border border-dashed bg-card/85 p-3 shadow-sm transition-colors hover:border-primary/40"
    >
      <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <Hammer className="h-3.5 w-3.5" />
        Open Errand
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ) : errand ? (
        <>
          <div className="flex gap-2">
            {errand.requesterAvatarUrl ? (
              <img
                src={errand.requesterAvatarUrl}
                alt={errand.requesterName}
                className="h-8 w-8 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[0.65rem] font-semibold text-muted-foreground">
                {getInitials(errand.requesterName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug">{errand.title}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                Requested by {errand.requesterName} · {errand.itemCount}{" "}
                {errand.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[0.7rem] leading-snug text-muted-foreground">
            {errand.materialStatus} · {errand.commissionStatus}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium leading-snug">
            No open crafting requests.
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            Nothing is waiting on the board.
          </p>
        </>
      )}
      <ArrowRight className="mt-2 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export function ThisWeekStrip({
  birthdayPeople,
  birthdayText,
  failed,
  loading,
  nextEventText,
  nextEventWhen,
  openErrand,
}: {
  birthdayPeople: { name: string; avatarUrl: string | null }[];
  birthdayText: string;
  failed: boolean;
  loading: boolean;
  nextEventText: string;
  nextEventWhen: string;
  openErrand: HomeOpenErrandSummary | null;
}) {
  return (
    <section className="gazette-reveal relative overflow-hidden rounded-lg border bg-card/70 p-4 shadow-sm">
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <NewspaperSectionLabel kicker="Weekly file">
          This Week
        </NewspaperSectionLabel>
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WeekTile
          description={nextEventWhen}
          descriptionClassName="lg:mt-3 lg:text-sm"
          icon={CalendarDays}
          label="Next Event"
          loading={loading}
          tileClassName="lg:col-span-2 lg:row-span-2 lg:p-5"
          titleClassName="lg:font-serif lg:text-2xl"
          title={nextEventText}
          to="/calendar"
        />
        <BirthdayWeekTile
          people={birthdayPeople}
          loading={loading}
          text={birthdayText}
        />
        {HOME_STATIC_WEEK_ITEMS.map(
          ({ label, title, description, icon, to }) => (
            <WeekTile
              key={label}
              description={description}
              icon={icon}
              label={label}
              title={title}
              to={to}
            />
          ),
        )}
        <OpenErrandTile errand={openErrand} loading={loading} />
      </div>
    </section>
  );
}
