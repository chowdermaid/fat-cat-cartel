export const EXPANSIONS = [
  { key: "ARR", label: "ARR", min: 2, max: 3 },
  { key: "HW", label: "HW", min: 3, max: 4 },
  { key: "SB", label: "SB", min: 4, max: 5 },
  { key: "ShB", label: "ShB", min: 5, max: 6 },
  { key: "EW", label: "EW", min: 6, max: 7 },
  { key: "DT", label: "DT", min: 7, max: 8 },
] as const;

export const RAID_TYPES = new Set(["Raid", "Chaotic Raid"]);

// Positions around the wheel perimeter (R=234, canvas center at ~240,292 within SpinWheel).
// Each entry is the top-left of a h-20 (80px) cat image placed just outside the wheel edge.
// 300-60 degrees (top arc) is excluded to avoid covering the spotlight label.
export const CAT_POSITIONS = [
  { top: 252, left: 464 }, // 3 o'clock
  { top: 439, left: 387 }, // 4:30
  { top: 516, left: 200 }, // 6 o'clock
  { top: 439, left: 13 }, // 7:30
  { top: 252, left: -64 }, // 9 o'clock
];

export const CANVAS_SIZE = 480;
export const WHEEL_RADIUS = 234;
export const WHEEL_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
];
