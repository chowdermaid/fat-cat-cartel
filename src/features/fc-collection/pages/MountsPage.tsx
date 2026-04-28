import { useFCCollection } from "../api/useFCCollection";
import { MountGrid } from "../components/MountGrid";

export function MountsPage() {
  const { allMounts, membersWithMounts, loading } = useFCCollection();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (allMounts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold font-serif">Mounts</h1>
        <p className="text-muted-foreground">
          No data yet. Go to{" "}
          <a href="/fc-collection" className="underline underline-offset-4 hover:text-foreground">
            FC Collection
          </a>{" "}
          and hit Refresh Data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Mounts</h1>
        <p className="mt-1 text-muted-foreground">
          {allMounts.length} mounts · {membersWithMounts.length} members tracked
        </p>
      </div>
      <MountGrid mounts={allMounts} members={membersWithMounts} />
    </div>
  );
}
