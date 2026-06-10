export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isValidBirthday(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(2024, month);
}

export function parseBirthday(
  value: string | null | undefined,
): { month: number; day: number } | null {
  if (!value) return null;
  const [monthRaw, dayRaw] = value.split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (!isValidBirthday(month, day)) return null;
  return { month, day };
}
