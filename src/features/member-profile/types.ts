export interface MemberProfile {
  bio: string | null;
  birthday: string | null;
  mainJobs: string[];
  timezone?: string | null;
  favoriteMountId?: number | null;
  favoriteMinionId?: number | null;
  favoriteContent?: string | null;
}
