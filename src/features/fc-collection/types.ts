import type { CollectibleKey } from "./collectibleConfig";

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
}

export interface MemberCacheData {
  avatar: string;
  owned: Record<CollectibleKey, number[]>;
  previousOwned: Record<CollectibleKey, number>;
  lastFetched: number;
}

export interface MemberWithMounts {
  id: string;
  name: string;
  lodestoneId: string;
  avatar: string;
  owned: Record<CollectibleKey, Set<number>>;
  previousOwned: Record<CollectibleKey, number>;
}
