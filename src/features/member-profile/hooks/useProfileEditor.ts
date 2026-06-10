import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { MemberCacheData } from "@/features/fc-collection/types";
import { saveOwnMemberProfile } from "../api/profileMutations";
import { EMPTY_PROFILE } from "../constants";
import type { CollectiblesData } from "./useMemberProfile";
import type { MemberProfile } from "../types";
import { encodeBirthday, parseBirthday, validBirthday } from "../utils/birthday";
import { favoriteOptions } from "../utils/collectibles";

export function useProfileEditor({
  collectionData,
  collectibles,
  lodestoneId,
  onOpenChange,
  onSaved,
  open,
  profile,
  sessionToken,
}: {
  collectionData: MemberCacheData | null;
  collectibles: CollectiblesData | null;
  lodestoneId: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (profile: MemberProfile) => void;
  open: boolean;
  profile: MemberProfile | null;
  sessionToken: string | null;
}) {
  const [draft, setDraft] = useState<MemberProfile>(EMPTY_PROFILE);
  const [{ month, day }, setBirthday] = useState({ month: 0, day: 0 });
  const [saving, setSaving] = useState(false);
  const mountOptions = useMemo(
    () => favoriteOptions(collectionData?.owned?.mounts, collectibles?.mounts),
    [collectionData, collectibles],
  );
  const minionOptions = useMemo(
    () =>
      favoriteOptions(collectionData?.owned?.minions, collectibles?.minions),
    [collectionData, collectibles],
  );

  useEffect(() => {
    if (!open) return;
    const nextProfile = profile ?? EMPTY_PROFILE;
    setDraft({
      bio: nextProfile.bio ?? null,
      birthday: nextProfile.birthday ?? null,
      mainJobs: Array.isArray(nextProfile.mainJobs) ? nextProfile.mainJobs : [],
      timezone: nextProfile.timezone ?? null,
      favoriteMountId: nextProfile.favoriteMountId ?? null,
      favoriteMinionId: nextProfile.favoriteMinionId ?? null,
      favoriteContent: nextProfile.favoriteContent ?? null,
    });
    setBirthday(parseBirthday(nextProfile.birthday ?? null));
  }, [open, profile]);

  function toggleJob(job: string) {
    setDraft((current) => {
      const jobs = current.mainJobs ?? [];
      const nextJobs = jobs.includes(job)
        ? jobs.filter((currentJob) => currentJob !== job)
        : jobs.length >= 8
          ? jobs
          : [...jobs, job];
      return { ...current, mainJobs: nextJobs };
    });
  }

  async function saveProfile() {
    if (!validBirthday(month, day)) {
      toast.error("Please provide a valid birthday.");
      return;
    }

    const nextProfile: MemberProfile = {
      bio: draft.bio?.trim() || null,
      birthday: encodeBirthday(month, day),
      mainJobs: draft.mainJobs ?? [],
      timezone: draft.timezone ?? null,
      favoriteMountId: draft.favoriteMountId ?? null,
      favoriteMinionId: draft.favoriteMinionId ?? null,
      favoriteContent: draft.favoriteContent ?? null,
    };

    setSaving(true);
    try {
      await saveOwnMemberProfile({ lodestoneId, profile: nextProfile, sessionToken });
      onSaved(nextProfile);
      onOpenChange(false);
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    birthday: { month, day },
    draft,
    minionOptions,
    mountOptions,
    saveProfile,
    saving,
    setBirthday,
    setDraft,
    toggleJob,
  };
}
