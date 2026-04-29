import type { LucideIcon } from "lucide-react";
import { Mountain, Rabbit } from "lucide-react";

export const COLLECTIBLE_KEYS = ["mounts", "minions"] as const;

export type CollectibleKey = (typeof COLLECTIBLE_KEYS)[number];

export interface CollectibleConfig {
  key: CollectibleKey;
  label: string;
  singular: string;
  apiPath: string;
  icon: LucideIcon;
}

export const COLLECTIBLE_CONFIG: CollectibleConfig[] = [
  { key: "mounts",  label: "Mounts",  singular: "Mount",  apiPath: "mounts",  icon: Mountain },
  { key: "minions", label: "Minions", singular: "Minion", apiPath: "minions", icon: Rabbit },
];
