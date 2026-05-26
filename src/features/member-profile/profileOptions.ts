export const PROFILE_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Manila",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Hobart",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Port_Moresby",
] as const;

export const FAVORITE_CONTENT_OPTIONS = [
  "Savage Raids",
  "Ultimate Raids",
  "Extremes",
  "Alliance Raids",
  "Dungeons",
  "Deep Dungeons",
  "Variant/Criterion",
  "Field Operations",
  "Treasure Maps",
  "Crafting/Gathering",
  "Fishing",
  "Housing",
  "Gold Saucer",
  "Glamour",
  "Mount Farming",
  "Minion Collecting",
  "Relic Farming",
  "Achievement Hunting",
  "Blue Mage",
  "PvP",
  "Roleplay",
  "AFKing",
  "Social Events",
] as const;

export function timezoneLabel(timezone: string): string {
  if (timezone === "UTC") return "UTC";
  const [, city = timezone] = timezone.split("/");
  return city.replace(/_/g, " ");
}

export function timezoneCountryCode(timezone: string): string {
  if (timezone === "UTC") return "UN";
  if (timezone.startsWith("America/")) return "US";
  if (timezone === "Europe/London") return "GB";
  if (timezone === "Europe/Berlin") return "DE";
  if (timezone === "Asia/Singapore") return "SG";
  if (timezone === "Asia/Tokyo") return "JP";
  if (timezone === "Asia/Seoul") return "KR";
  if (timezone === "Asia/Hong_Kong") return "HK";
  if (timezone === "Asia/Manila") return "PH";
  if (timezone.startsWith("Australia/")) return "AU";
  if (timezone === "Pacific/Auckland" || timezone === "Pacific/Chatham") return "NZ";
  if (timezone === "Pacific/Fiji") return "FJ";
  if (timezone === "Pacific/Guam") return "GU";
  if (timezone === "Pacific/Port_Moresby") return "PG";
  return "UN";
}
