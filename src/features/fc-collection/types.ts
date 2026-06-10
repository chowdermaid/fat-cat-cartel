import type { LucideIcon } from "lucide-react";

export type CollectibleKey = "mounts" | "minions" | "titles" | "achievements";

export interface CollectibleConfig {
  key: CollectibleKey;
  label: string;
  singular: string;
  apiPath: string;
  icon: LucideIcon;
  rankBy?: "count" | "points";
  categoryFilter?: string[];
  fetchLimit?: number;
}

export type AllCollectibles = Record<CollectibleKey, Collectible[]>;

export interface FCCollectionState {
  members: FCMember[];
  allCollectibles: AllCollectibles;
  membersWithMounts: MemberWithMounts[];
  memberData: Record<string, MemberCacheData>;
  lastFetched: number | null;
  loading: boolean;
}

export type CollectionScope = "fc" | "all";

export interface CollectibleSource {
  type: string;
  text: string;
}

export interface Collectible {
  id: number;
  name: string;
  description?: string;
  icon: string;
  image?: string;
  patch: string;
  owned: string;
  points?: number;
  sources?: CollectibleSource[];
}

export interface Mount extends Collectible {
  seats: number;
  movement: string;
  image: string;
}

export interface FCMember {
  id: string;
  name: string;
  lodestoneId: string;
  fcRank: string | null;
}

export interface PreviousOwnedEntry {
  count: number;
  asOf: number;
}

export interface MemberCacheData {
  avatar: string;
  owned: Record<CollectibleKey, number[]>;
  previousOwned: Record<CollectibleKey, PreviousOwnedEntry>;
  lastFetched: number;
}

export interface MemberWithMounts {
  id: string;
  name: string;
  lodestoneId: string;
  fcRank: string | null;
  isFriend: boolean;
  avatar: string;
  owned: Record<CollectibleKey, Set<number>>;
  previousOwned: Record<CollectibleKey, number>;
}
