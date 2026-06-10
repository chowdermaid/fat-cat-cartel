import { useRef } from "react";
import { Users } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { useMemberProfiles } from "../hooks/useMemberProfiles";
import { useMembersGridAnimation } from "../hooks/useMembersGridAnimation";
import { sortMemberEntries } from "../utils/sorting";
import { MemberCard } from "./MemberCard";

export function MembersPage() {
  const members = useMembers();
  const profiles = useMemberProfiles();
  const pageRef = useRef<HTMLDivElement>(null);

  const entries = sortMemberEntries(Object.entries(members));
  const totalCount = entries.length;

  useMembersGridAnimation(pageRef, totalCount);

  return (
    <div ref={pageRef} className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
          <Users className="h-7 w-7 text-muted-foreground" />
          Members
        </h1>
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map(([id, member]) => (
            <MemberCard
              key={id}
              lodestoneId={id}
              member={member}
              profile={profiles[id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
