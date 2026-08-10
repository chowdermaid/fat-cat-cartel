import type { Member } from "@/types";
import type { Participant } from "@/types";
import type { FavoriteCollectibleOption } from "@/features/member-profile/FavoriteCollectiblePicker";

export type SelectedAdminView =
  | "easter2026"
  | "fc-members"
  | "game-server-access";

export type AdminAuthState = "checking" | "authed" | "login" | "unauthorized";

export interface AdminSession {
  discordUserId: string;
  discordUsername: string | null;
  discordDisplayName: string | null;
  discordAvatarUrl: string | null;
  lodestoneId: string | null;
  characterName: string | null;
  fcRank: string | null;
  avatarUrl?: string | null;
  roleIds: string[];
  isMember: boolean;
  isAdmin: boolean;
  isHousecat: boolean;
  canUseGameServers?: boolean;
  capabilities?: string[];
  expiresAt: number;
}

export interface AuthSnapshot {
  state: AdminAuthState;
  sessionToken: string | null;
  session: AdminSession | null;
  error: string | null;
  errorCode: string | null;
}

export type AdminPageShellProps = {
  adminSessionToken: string | null;
  characterName?: string | null;
  onLogout: () => void;
};

export type CalendarSyncStatusProps = {
  adminSessionToken: string | null;
};

export type ParseFailure = {
  messageId?: unknown;
  reason?: unknown;
  sampledAt?: unknown;
};

export type CalendarSyncStatusState = {
  lastStartedAt: number | null;
  lastSucceededAt: number | null;
  lastFailedAt: number | null;
  importedCount: number;
  skippedCount: number;
  lastError: string | null;
  recentFailures: ParseFailure[];
};

export type FCRank = "Boss" | "Underpaw" | "Housecat" | "Stray" | "Friend";
export type SortKey = "name" | "rank" | "lodestoneId";
export type SortDir = "asc" | "desc";
export type SyncSource = "collection" | "tomestone" | "fflogs" | "lodestone";
export type SyncState =
  | "current"
  | "stale"
  | "missing"
  | "no-id"
  | "no-data"
  | "no-activity"
  | "failed"
  | "unknown-age";

export type MemberSyncStatus = {
  collection: SourceSyncStatus;
  tomestone: SourceSyncStatus;
  fflogs: SourceSyncStatus;
  lodestone: SourceSyncStatus;
};

export type SyncMetadata = {
  status?: "success" | "error";
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  message?: string;
  details?: unknown;
};

export type SourceSyncStatus = {
  source: SyncSource;
  state: SyncState;
  label: string;
  detail: string;
  actionable: boolean;
};

export type AdminMember = Member & { id: string };

export type DeleteTarget = {
  id: string;
  name: string;
};

export type ProfileFavoriteOptions = {
  favoriteMountOptions: FavoriteCollectibleOption[];
  favoriteMinionOptions: FavoriteCollectibleOption[];
};

export interface LocalParticipant extends Participant {
  dirty: boolean;
  saving: boolean;
}
