export function parseBirthday(mmdd: string | null): { month: number; day: number } {
  if (!mmdd) return { month: 0, day: 0 };
  const [m, d] = mmdd.split("-").map(Number);
  return { month: m || 0, day: d || 0 };
}

export function encodeBirthday(month: number, day: number): string | null {
  if (!month || !day) return null;
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
