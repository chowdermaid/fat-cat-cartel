import type { MemberProfile } from "@/features/member-profile/types";
import type { Member } from "@/types";

export type MemberProfileMap = Record<string, MemberProfile>;

export type MemberEntry = [lodestoneId: string, member: Member];

export type MemberCardProps = {
  lodestoneId: string;
  member: Member;
  profile?: MemberProfile | null;
};
