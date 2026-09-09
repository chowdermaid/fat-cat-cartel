const sydneyTime = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  hour: "numeric",
  hourCycle: "h23",
  weekday: "long",
  month: "2-digit",
  day: "2-digit",
});

export function getHomeGreeting(
  date: Date,
  name?: string | null,
  birthday?: string | null,
): string {
  const parts = sydneyTime.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;
  const hour = Number(part("hour"));
  const memberName = name?.trim();
  const suffix = memberName ? `, ${memberName}` : "";
  if (hour >= 1 && hour < 5) {
    return "Go sleep ya gremlin";
  }
  if (memberName && birthday === `${part("month")}-${part("day")}`)
    return `Happy birthday${suffix}!`;
  const period =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 18
        ? "afternoon"
        : "evening";
  const weekday = part("weekday");
  const weekend =
    weekday === "Saturday" || weekday === "Sunday" ? ` Happy ${weekday}!` : "";
  return `Good ${period}${suffix}!${weekend}`;
}
