const jobIconMap = import.meta.glob<string>("../../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const JOB_ICON_SLUG: Record<string, string> = {
  Paladin: "paladin",
  Warrior: "warrior",
  "Dark Knight": "darkknight",
  Gunbreaker: "gunbreaker",
  "White Mage": "whitemage",
  Scholar: "scholar",
  Astrologian: "astrologian",
  Sage: "sage",
  Monk: "monk",
  Dragoon: "dragoon",
  Ninja: "ninja",
  Samurai: "samurai",
  Reaper: "reaper",
  Viper: "viper",
  Bard: "bard",
  Machinist: "machinist",
  Dancer: "dancer",
  "Black Mage": "blackmage",
  Summoner: "summoner",
  "Red Mage": "redmage",
  Pictomancer: "pictomancer",
};

export function jobIcon(fullName: string): string | null {
  const slug = JOB_ICON_SLUG[fullName];
  return slug ? (jobIconMap[`../../../assets/jobs/${slug}.png`] ?? null) : null;
}
