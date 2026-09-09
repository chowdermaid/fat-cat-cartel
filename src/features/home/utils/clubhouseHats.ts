export const CLUBHOUSE_HATS = [
  {
    id: "fat-cat-cartel-fedora",
    label: "Cartel Fedora",
    width: 1.4,
    left: -0.2,
    top: -0.6,
    aspectRatio: 560 / 800,
    origin: { x: 0.5, y: 110 / 168 },
    rotation: 10,
  },
  {
    id: "cartel-flat-cap",
    label: "Flat Cap",
    width: 1.25,
    left: -0.125,
    top: -0.43,
    aspectRatio: 280 / 480,
    origin: { x: 0.5, y: 100 / 140 },
    rotation: -10,
  },
  {
    id: "cartel-witch-hat",
    label: "Witch Hat",
    width: 1.4,
    left: -0.2,
    top: -0.76,
    aspectRatio: 540 / 720,
    origin: { x: 0.5, y: 130 / 180 },
    rotation: 0,
  },
  {
    id: "fat-cat-avatar-ears",
    label: "Fat Cat Ears",
    width: 1,
    left: -0.0,
    top: -0.2,
    aspectRatio: 390 / 720,
    origin: { x: 0.5, y: 100 / 130 },
    rotation: 0,
  },
  {
    id: "cartel-tiny-crown",
    label: "Tiny Crown",
    width: 1.1,
    left: -0.05,
    top: -0.56,
    aspectRatio: 360 / 480,
    origin: { x: 0.5, y: 130 / 180 },
    rotation: 0,
  },
] as const;

export type ClubhouseHatId = (typeof CLUBHOUSE_HATS)[number]["id"];
export type ClubhouseHat = (typeof CLUBHOUSE_HATS)[number];

export function getClubhouseHat(id: unknown): ClubhouseHat {
  return CLUBHOUSE_HATS.find((hat) => hat.id === id) ?? CLUBHOUSE_HATS[0];
}
