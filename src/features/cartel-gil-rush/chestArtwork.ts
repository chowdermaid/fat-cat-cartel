import simpleChest from "@/assets/cartel-gil-rush/simple-chest.svg?raw";

export const chestArtwork = ["#60A5FA", "#34D399", "#A78BFA", "#FBBF24"].map(color =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(simpleChest.replaceAll("#D6AF48", color))}`,
);
