import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FavoriteCollectiblePicker,
  type FavoriteCollectibleOption,
} from "@/features/member-profile/FavoriteCollectiblePicker";
import {
  FAVORITE_CONTENT_OPTIONS,
  PROFILE_TIMEZONES,
  timezoneLabel,
} from "@/features/member-profile/profileOptions";
import type { MemberProfile } from "@/features/member-profile/types";
import { cn } from "@/lib/utils";
import { DAYS, FC_RANKS, JOBS, MONTHS } from "../../constants";
import type { AdminMember, FCRank } from "../../types";
import { jobIcon } from "../../utils/jobIcons";

type MemberProfileDialogProps = {
  editingMemberId: string | null;
  editingMember: AdminMember | undefined;
  profileDraft: MemberProfile;
  setProfileDraft: Dispatch<SetStateAction<MemberProfile>>;
  rankDraft: FCRank | "";
  setRankDraft: Dispatch<SetStateAction<FCRank | "">>;
  bdMonth: number;
  setBdMonth: Dispatch<SetStateAction<number>>;
  bdDay: number;
  setBdDay: Dispatch<SetStateAction<number>>;
  favoriteMountOptions: FavoriteCollectibleOption[];
  favoriteMinionOptions: FavoriteCollectibleOption[];
  profileSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onToggleJob: (full: string) => void;
};

const selectClass =
  "rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function MemberProfileDialog({
  editingMemberId,
  editingMember,
  profileDraft,
  setProfileDraft,
  rankDraft,
  setRankDraft,
  bdMonth,
  setBdMonth,
  bdDay,
  setBdDay,
  favoriteMountOptions,
  favoriteMinionOptions,
  profileSaving,
  onOpenChange,
  onCancel,
  onSave,
  onToggleJob,
}: MemberProfileDialogProps) {
  return (
    <Dialog open={!!editingMemberId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile: {editingMember?.name ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label>FC Rank</Label>
            <select
              value={rankDraft}
              onChange={(e) => setRankDraft(e.target.value as FCRank | "")}
              className={cn(selectClass, "w-full")}
            >
              <option value="">No rank</option>
              {FC_RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Bio</Label>
            <textarea
              value={profileDraft.bio ?? ""}
              onChange={(e) =>
                setProfileDraft((d) => ({
                  ...d,
                  bio: e.target.value || null,
                }))
              }
              placeholder="A short bio..."
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Birthday</Label>
            <div className="flex gap-2">
              <Select
                value={bdMonth ? String(bdMonth) : ""}
                onValueChange={(v) => setBdMonth(Number(v))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((label, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={bdDay ? String(bdDay) : ""}
                onValueChange={(v) => setBdDay(Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select
                value={profileDraft.timezone ?? "none"}
                onValueChange={(value) =>
                  setProfileDraft((d) => ({
                    ...d,
                    timezone: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No timezone</SelectItem>
                  {PROFILE_TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezoneLabel(timezone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Favorite Content</Label>
              <Select
                value={profileDraft.favoriteContent ?? "none"}
                onValueChange={(value) =>
                  setProfileDraft((d) => ({
                    ...d,
                    favoriteContent: value === "none" ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Favorite content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No favorite</SelectItem>
                  {FAVORITE_CONTENT_OPTIONS.map((content) => (
                    <SelectItem key={content} value={content}>
                      {content}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FavoriteCollectiblePicker
              label="Favorite Mount"
              emptyText="No synced owned mounts yet."
              options={favoriteMountOptions}
              value={profileDraft.favoriteMountId}
              onChange={(value) =>
                setProfileDraft((d) => ({ ...d, favoriteMountId: value }))
              }
            />

            <FavoriteCollectiblePicker
              label="Favorite Minion"
              emptyText="No synced owned minions yet."
              options={favoriteMinionOptions}
              value={profileDraft.favoriteMinionId}
              onChange={(value) =>
                setProfileDraft((d) => ({ ...d, favoriteMinionId: value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Main Jobs</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {JOBS.map(({ abbr, full }) => {
                const selected = (profileDraft.mainJobs ?? []).includes(full);
                const icon = jobIcon(full);
                return (
                  <button
                    key={abbr}
                    type="button"
                    title={full}
                    onClick={() => onToggleJob(full)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/60",
                    )}
                  >
                    {icon ? (
                      <img
                        src={icon}
                        alt={abbr}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    ) : (
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-mono">
                        {abbr}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-mono leading-none",
                        selected
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {abbr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={profileSaving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
