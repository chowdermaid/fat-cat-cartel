export interface MountSource {
  type: string;
  text: string;
}

export interface Mount {
  id: number;
  name: string;
  description: string;
  icon: string;
  image: string;
  patch: string;
  seats: number;
  owned: string;
  movement: string;
  sources: MountSource[];
}

export interface FCMember {
  id: string;
  name: string;
  lodestoneId: string;
}

export interface MemberCacheData {
  avatar: string;
  ownedMountIds: number[];
  previousCount: number;
  lastFetched: number;
}

export interface MemberWithMounts {
  id: string;
  name: string;
  lodestoneId: string;
  avatar: string;
  ownedMountIds: Set<number>;
  previousCount: number;
}
