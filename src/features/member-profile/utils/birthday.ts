export function formatBirthday(mmdd: string): string {
  const [month, day] = mmdd.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[month - 1] ?? "?"} ${day}`;
}

export function parseBirthday(mmdd: string | null): { month: number; day: number } {
  if (!mmdd) return { month: 0, day: 0 };
  const [month, day] = mmdd.split("-").map(Number);
  return { month: month || 0, day: day || 0 };
}

export function validBirthday(month: number, day: number): boolean {
  if (!month && !day) return true;
  if (month < 1 || month > 12 || day < 1) return false;
  const daysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysByMonth[month - 1];
}

export function encodeBirthday(month: number, day: number): string | null {
  if (!month && !day) return null;
  if (!validBirthday(month, day)) return null;
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
