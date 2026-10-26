import dice from "@/assets/cartel-gil-rush/dice.png";
import pushYourLuck from "@/assets/cartel-gil-rush/push-your-luck.png";
import underdog from "@/assets/cartel-gil-rush/underdog.png";
import workersCompensation from "@/assets/cartel-gil-rush/workers-compensation.png";
import type { Mood } from "./types";

export const moodArtwork: Record<Mood, string> = {
  yellow: dice,
  blue: underdog,
  violet: pushYourLuck,
  red: workersCompensation,
};
