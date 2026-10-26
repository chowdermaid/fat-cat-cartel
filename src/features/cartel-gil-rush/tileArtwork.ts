import shark from "@/assets/cartel-gil-rush/shark.svg";
import moogle from "@/assets/cartel-gil-rush/moogle.svg";
import mushroom from "@/assets/cartel-gil-rush/mushroom.svg";
import chocobo from "@/assets/cartel-gil-rush/chocobo.svg";
import ladder from "@/assets/cartel-gil-rush/ladder.svg";
import redArrow from "@/assets/cartel-gil-rush/red-arrow.svg";
import fatcat from "@/assets/cartel-gil-rush/fat-cat.svg";
import type { Tile } from "./types";

export const tileArtwork: Record<Tile["id"], string> = {
  shark,
  moogle,
  mushroom,
  fatcat,
  chocobo,
  ladder,
  "red-arrow": redArrow,
};
