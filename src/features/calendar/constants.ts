import type { ComponentType } from "react";
import {
  Bell,
  Compass,
  Gem,
  MapPin,
  PartyPopper,
  Siren,
  Swords,
} from "lucide-react";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const SHORT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  timeStyle: "short",
});

export const DATE_BUTTON_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const DATE_TIME_PREVIEW_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export const TIME_ZONE_PREVIEWS = [
  {
    label: "Sydney / Melbourne",
    timeZone: "Australia/Sydney",
    countryCode: "AU",
  },
  { label: "Brisbane", timeZone: "Australia/Brisbane", countryCode: "AU" },
  { label: "Perth", timeZone: "Australia/Perth", countryCode: "AU" },
  { label: "Adelaide", timeZone: "Australia/Adelaide", countryCode: "AU" },
  { label: "New Zealand", timeZone: "Pacific/Auckland", countryCode: "NZ" },
  { label: "Singapore", timeZone: "Asia/Singapore", countryCode: "SG" },
] as const;

export const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);

export const MINUTES = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

export const RAID_HELPER_PING_ROLES: Array<{
  label: string;
  id: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: "ROULETTES", id: "1339834783064264715", icon: Compass },
  { label: "MOUNT FARMING", id: "1339833858442657834", icon: Bell },
  { label: "TREASURE MAPS", id: "1339828715164532846", icon: Gem },
  { label: "FIELD OPERATIONS", id: "1339834667561648198", icon: MapPin },
  {
    label: "RAIDS / TRIALS / VARIANT / DD",
    id: "1339833818055446621",
    icon: Swords,
  },
  { label: "SOCIAL EVENTS", id: "1339835677457514567", icon: PartyPopper },
  {
    label: "HUNTS / FATES / RED ALERTS",
    id: "1374967120235855946",
    icon: Siren,
  },
];
