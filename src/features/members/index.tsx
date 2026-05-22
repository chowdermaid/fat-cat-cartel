import { useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import { User } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import type { Member } from "@/types";

const RANK_ORDER = ["Boss", "Underpaw", "Housecat", "Stray", "Friend"] as const;

function MemberCard({
  lodestoneId,
  member,
}: {
  lodestoneId: string;
  member: Member;
}) {
  return (
    <Link
      to="/members/$lodestoneId"
      params={{ lodestoneId }}
      className="member-card group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-muted/50 hover:border-primary/50"
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.name}
          className="w-16 h-16 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/50 transition-all"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center ring-2 ring-border group-hover:ring-primary/50 transition-all">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 w-full">
        <p className="text-sm font-semibold truncate">{member.name}</p>
      </div>
    </Link>
  );
}

export function MembersPage() {
  const members = useMembers();
  const pageRef = useRef<HTMLDivElement>(null);

  const allEntries = Object.entries(members).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  );

  const groups = RANK_ORDER.map((rank) => ({
    rank,
    entries: allEntries.filter(([, m]) => m.fcRank === rank),
  })).filter((g) => g.entries.length > 0);

  const unranked = allEntries.filter(
    ([, m]) =>
      !m.fcRank || !(RANK_ORDER as readonly string[]).includes(m.fcRank),
  );

  const totalCount = allEntries.length;

  useEffect(() => {
    if (!pageRef.current || totalCount === 0) return;
    animate(pageRef.current.querySelectorAll(".member-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(40),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [totalCount]);

  return (
    <div ref={pageRef} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif">Members</h1>
      </div>

      {totalCount === 0 && (
        <p className="text-muted-foreground text-sm">No members found.</p>
      )}

      {groups.map(({ rank, entries }) => (
        <section key={rank} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {rank}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {entries.map(([id, member]) => (
              <MemberCard key={id} lodestoneId={id} member={member} />
            ))}
          </div>
        </section>
      ))}

      {unranked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Others
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {unranked.map(([id, member]) => (
              <MemberCard key={id} lodestoneId={id} member={member} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
