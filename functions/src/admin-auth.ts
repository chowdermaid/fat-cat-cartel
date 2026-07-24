import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const SESSION_HOURS = 730;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;
const OAUTH_STATE_MS = 10 * 60 * 1000;
const LAST_SEEN_WRITE_MS = 5 * 60 * 1000;
const STATE_COOKIE = "fcc_admin_oauth_state";
const DEFAULT_RETURN_TO = "/";
const LOCAL_DEV_ADMIN_SESSION_TOKEN = "local-dev-admin-session-token-00000001";

export interface AdminAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  guildId: string;
  adminRoleIds: string;
  memberRoleIds: string;
  botToken: string;
  appOrigin: string;
}

export type AdminOAuthStartConfig = Pick<
  AdminAuthConfig,
  "clientId" | "redirectUri" | "appOrigin"
>;

export interface AdminSession {
  discordUserId: string;
  discordUsername?: string | null;
  discordDisplayName?: string | null;
  discordAvatarUrl?: string | null;
  lodestoneId?: string | null;
  characterName?: string | null;
  fcRank: string | null;
  avatarUrl: string | null;
  roleIds: string[];
  isMember?: boolean;
  isAdmin?: boolean;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
}

interface DiscordTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface DiscordUser {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
}

interface DiscordGuildMember {
  roles?: unknown;
  user?: DiscordUser;
}

export interface VerifiedAdminSession extends AdminSession {
  lodestoneId: string;
  characterName: string;
  sessionHash: string;
}

export interface VerifiedAuthenticatedSession extends AdminSession {
  sessionHash: string;
}

type MemberSessionConfig = Pick<
  AdminAuthConfig,
  "guildId" | "adminRoleIds" | "memberRoleIds" | "botToken"
> & { housecatRoleId?: string };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function parseRoleIds(value: string): string[] {
  return value
    .split(",")
    .map((roleId) => roleId.trim())
    .filter(Boolean);
}

export function hasAnyRole(memberRoles: string[], allowedRoleIds: string[]): boolean {
  const memberRoleSet = new Set(memberRoles);
  return allowedRoleIds.some((roleId) => memberRoleSet.has(roleId));
}

function assertDevRoleOverrideSafety(): void {
  if (
    process.env.FUNCTIONS_DEV_ALLOW_ROLE_OVERRIDE === "true" &&
    process.env.FUNCTIONS_EMULATOR !== "true"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Discord role override cannot be enabled outside local emulator.",
    );
  }
}

function applyDevRoleOverride(
  roleIds: string[],
  config: MemberSessionConfig,
): string[] {
  assertDevRoleOverrideSafety();
  const overrideEnabled =
    process.env.FUNCTIONS_DEV_ALLOW_ROLE_OVERRIDE === "true";
  const overrideRole = process.env.FUNCTIONS_DEV_DISCORD_ROLE_OVERRIDE;
  if (!overrideEnabled || !overrideRole) return roleIds;

  if (overrideRole !== "housecat") {
    throw new HttpsError(
      "failed-precondition",
      "Unsupported local Discord role override.",
    );
  }

  const housecatRoleId = config.housecatRoleId?.trim();
  if (!housecatRoleId) {
    throw new HttpsError(
      "failed-precondition",
      "Housecat role override requires DISCORD_HOUSECAT_ROLE_ID.",
    );
  }

  const adminRoleIds = new Set(parseRoleIds(config.adminRoleIds));
  return Array.from(
    new Set([
      ...roleIds.filter((roleId) => !adminRoleIds.has(roleId)),
      housecatRoleId,
    ]),
  );
}

function getSessionToken(data: unknown): string {
  const token =
    typeof data === "object" && data
      ? ((data as { adminSessionToken?: unknown; sessionToken?: unknown })
          .adminSessionToken ??
        (data as { sessionToken?: unknown }).sessionToken)
      : null;
  if (typeof token !== "string" || token.length < 32) {
    throw new HttpsError("unauthenticated", "Admin session is required.");
  }
  return token;
}

export function authenticatedSessionRecordIsValid(
  session: AdminSession | null,
  now = Date.now(),
): session is AdminSession {
  return Boolean(
    session?.discordUserId &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > now,
  );
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function redirectUrl(
  appOrigin: string,
  params: Record<string, string>,
): string {
  const url = new URL("/admin", appOrigin);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}

function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

function redirectToApp(
  appOrigin: string,
  returnTo: string,
  params: Record<string, string>,
): string {
  const url = new URL(safeReturnTo(returnTo), appOrigin);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}

function cookieIsSecure(
  config: Pick<AdminAuthConfig, "redirectUri" | "appOrigin">,
): boolean {
  return (
    config.redirectUri.startsWith("https://") &&
    config.appOrigin.startsWith("https://")
  );
}

function cookieValue(
  req: { cookies?: Record<string, string>; headers?: Record<string, unknown> },
  name: string,
): string {
  const parsedCookie = req.cookies?.[name];
  if (parsedCookie) return parsedCookie;

  const header = req.headers?.cookie;
  if (typeof header !== "string") return "";

  for (const part of header.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

async function discordJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord request failed: ${response.status} ${body.slice(0, 200)}`,
    );
  }
  return response.json() as Promise<T>;
}

async function fetchCurrentUser(accessToken: string): Promise<DiscordUser> {
  return discordJson<DiscordUser>(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchCurrentUserGuildMember(
  accessToken: string,
  guildId: string,
): Promise<DiscordGuildMember> {
  return discordJson<DiscordGuildMember>(
    `${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

async function fetchOptionalCurrentUserGuildMember(
  accessToken: string,
  guildId: string,
): Promise<DiscordGuildMember | null> {
  try {
    return await fetchCurrentUserGuildMember(accessToken, guildId);
  } catch {
    return null;
  }
}

async function fetchGuildMemberWithBot(
  botToken: string,
  guildId: string,
  discordUserId: string,
): Promise<DiscordGuildMember> {
  return discordJson<DiscordGuildMember>(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
    {
      headers: { Authorization: `Bot ${botToken}` },
    },
  );
}

function roleIdsFromMember(member: DiscordGuildMember): string[] {
  return Array.isArray(member.roles)
    ? member.roles.filter(
        (roleId): roleId is string => typeof roleId === "string",
      )
    : [];
}

function discordAvatarUrl(user: DiscordUser): string | null {
  if (!user.id || !user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

async function linkedCharacter(discordUserId: string): Promise<{
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
}> {
  const db = admin.database();
  const linkSnapshot = await db.ref(`discordLinks/${discordUserId}`).get();
  const link = linkSnapshot.val() as { lodestoneId?: unknown } | null;
  if (!link || typeof link.lodestoneId !== "string") {
    throw new HttpsError(
      "failed-precondition",
      "Link your Lodestone profile first with the Discord /link command, or /friend signup if you are not in the FC.",
    );
  }

  const memberSnapshot = await db.ref(`members/${link.lodestoneId}`).get();
  const member = memberSnapshot.val() as {
    name?: unknown;
    fcRank?: unknown;
    avatarUrl?: unknown;
  } | null;
  if (!member || typeof member.name !== "string" || !member.name.trim()) {
    throw new HttpsError(
      "failed-precondition",
      "Your linked character is no longer tracked.",
    );
  }

  return {
    lodestoneId: link.lodestoneId,
    characterName: member.name.trim(),
    fcRank:
      typeof member.fcRank === "string" && member.fcRank.trim()
        ? member.fcRank.trim()
        : null,
    avatarUrl:
      typeof member.avatarUrl === "string" && member.avatarUrl.trim()
        ? member.avatarUrl.trim()
        : null,
  };
}

async function exchangeCode(
  config: AdminAuthConfig,
  code: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const token = await discordJson<DiscordTokenResponse>(
    `${DISCORD_API_BASE}/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!token.access_token) {
    throw new Error("Discord did not return an access token.");
  }
  return token.access_token;
}

export async function startDiscordAdminOAuth(
  config: AdminOAuthStartConfig,
  req: { query: Record<string, unknown> },
  res: {
    cookie: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => void;
    redirect: (url: string) => void;
  },
): Promise<void> {
  const state = randomToken(24);
  const stateHash = hashToken(state);
  const now = Date.now();
  await admin
    .database()
    .ref(`adminOAuthStates/${stateHash}`)
    .set({
      createdAt: now,
      expiresAt: now + OAUTH_STATE_MS,
      returnTo: safeReturnTo(req.query.returnTo),
    });

  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: cookieIsSecure(config),
    sameSite: "lax",
    maxAge: OAUTH_STATE_MS,
    path: "/",
  });

  const authorizeUrl = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "identify guilds.members.read");
  authorizeUrl.searchParams.set("state", state);
  res.redirect(authorizeUrl.toString());
}

export async function finishDiscordAdminOAuth(
  config: AdminAuthConfig,
  req: {
    query: Record<string, unknown>;
    cookies?: Record<string, string>;
    headers?: Record<string, unknown>;
  },
  res: {
    clearCookie: (name: string, options: Record<string, unknown>) => void;
    redirect: (url: string) => void;
  },
): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = cookieValue(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, { path: "/" });

  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
    res.redirect(
      redirectUrl(config.appOrigin, { admin_error: "invalid_state" }),
    );
    return;
  }

  const stateHash = hashToken(state);
  const stateRef = admin.database().ref(`adminOAuthStates/${stateHash}`);
  const stateSnap = await stateRef.get();
  await stateRef.remove();
  const storedState = stateSnap.val() as {
    expiresAt?: unknown;
    returnTo?: unknown;
  } | null;
  if (
    !storedState ||
    typeof storedState.expiresAt !== "number" ||
    storedState.expiresAt <= Date.now()
  ) {
    res.redirect(
      redirectUrl(config.appOrigin, { admin_error: "invalid_state" }),
    );
    return;
  }
  const returnTo = safeReturnTo(storedState.returnTo);

  try {
    const accessToken = await exchangeCode(config, code);
    const [user, member] = await Promise.all([
      fetchCurrentUser(accessToken),
      fetchOptionalCurrentUserGuildMember(accessToken, config.guildId),
    ]);
    const discordUserId = user.id;
    if (!discordUserId) {
      throw new Error("Discord did not return a user ID.");
    }
    const roleIds = member ? roleIdsFromMember(member) : [];
    const adminRoleIds = parseRoleIds(config.adminRoleIds);
    const memberRoleIds = parseRoleIds(config.memberRoleIds);
    const hasMemberRole =
      hasAnyRole(roleIds, adminRoleIds) || hasAnyRole(roleIds, memberRoleIds);
    let character: Awaited<ReturnType<typeof linkedCharacter>> | null = null;
    if (hasMemberRole) {
      try {
        character = await linkedCharacter(discordUserId);
      } catch (error) {
        if (!(error instanceof HttpsError)) throw error;
      }
    }
    const isMember = character !== null;
    const isAdmin = isMember && hasAnyRole(roleIds, adminRoleIds);

    const sessionToken = randomToken(48);
    const sessionHash = hashToken(sessionToken);
    const now = Date.now();
    await admin
      .database()
      .ref(`adminSessions/${sessionHash}`)
      .set({
        discordUserId,
        discordUsername: user.username?.trim() || null,
        discordDisplayName: user.global_name?.trim() || user.username?.trim() || null,
        discordAvatarUrl: discordAvatarUrl(user),
        lodestoneId: character?.lodestoneId ?? null,
        characterName: character?.characterName ?? null,
        fcRank: character?.fcRank ?? null,
        avatarUrl: character?.avatarUrl ?? null,
        roleIds,
        isMember,
        isAdmin,
        createdAt: now,
        expiresAt: now + SESSION_MS,
        lastSeenAt: now,
      });

    res.redirect(
      redirectToApp(config.appOrigin, returnTo, {
        admin_session: sessionToken,
      }),
    );
  } catch (error) {
    console.error("Discord admin OAuth failed", error);
    res.redirect(
      redirectToApp(config.appOrigin, returnTo, {
        admin_error: "oauth_failed",
      }),
    );
  }
}

export async function requireAuthenticatedSession(
  data: unknown,
): Promise<VerifiedAuthenticatedSession> {
  const token = getSessionToken(data);
  if (
    process.env.FUNCTIONS_EMULATOR === "true" &&
    token === LOCAL_DEV_ADMIN_SESSION_TOKEN
  ) {
    return {
      discordUserId: "local-dev",
      discordUsername: "local-dev",
      discordDisplayName: "Local Admin",
      discordAvatarUrl: null,
      lodestoneId: "local-dev",
      characterName: "Local Admin",
      fcRank: "Dev",
      avatarUrl: null,
      roleIds: ["local-dev"],
      isMember: true,
      isAdmin: true,
      createdAt: 0,
      expiresAt: Number.MAX_SAFE_INTEGER,
      lastSeenAt: Date.now(),
      sessionHash: "local-dev",
    };
  }

  const sessionHash = hashToken(token);
  const sessionRef = admin.database().ref(`adminSessions/${sessionHash}`);
  const snapshot = await sessionRef.get();
  const session = snapshot.val() as AdminSession | null;
  const now = Date.now();

  if (!authenticatedSessionRecordIsValid(session, now)) {
    await sessionRef.remove();
    throw new HttpsError("unauthenticated", "Application session expired.");
  }

  if (!session.lastSeenAt || now - session.lastSeenAt > LAST_SEEN_WRITE_MS) {
    await sessionRef.update({ lastSeenAt: now });
  }

  return {
    ...session,
    discordUsername: session.discordUsername ?? null,
    discordDisplayName:
      session.discordDisplayName ?? session.characterName ?? null,
    discordAvatarUrl: session.discordAvatarUrl ?? null,
    lodestoneId: session.lodestoneId ?? null,
    characterName: session.characterName ?? null,
    fcRank: session.fcRank ?? null,
    avatarUrl: session.avatarUrl ?? null,
    roleIds: Array.isArray(session.roleIds) ? session.roleIds : [],
    isMember: session.isMember ?? Boolean(session.lodestoneId),
    isAdmin: session.isAdmin === true,
    sessionHash,
  };
}

export async function requireMemberSession(
  data: unknown,
  config: MemberSessionConfig,
): Promise<VerifiedAdminSession> {
  assertDevRoleOverrideSafety();
  const session = await requireAuthenticatedSession(data);
  const sessionRef = admin.database().ref(`adminSessions/${session.sessionHash}`);
  const now = Date.now();
  let currentRoleIds: string[];
  try {
    currentRoleIds = roleIdsFromMember(
      await fetchGuildMemberWithBot(
        config.botToken,
        config.guildId,
        session.discordUserId,
      ),
    );
  } catch {
    throw new HttpsError(
      "permission-denied",
      "Could not verify Discord guild membership.",
    );
  }

  const adminRoleIds = parseRoleIds(config.adminRoleIds);
  const memberRoleIds = parseRoleIds(config.memberRoleIds);
  const isAdmin = hasAnyRole(currentRoleIds, adminRoleIds);

  if (!isAdmin && !hasAnyRole(currentRoleIds, memberRoleIds)) {
    throw new HttpsError("permission-denied", "Allowed Discord role required.");
  }

  let character: Awaited<ReturnType<typeof linkedCharacter>>;
  try {
    character = await linkedCharacter(session.discordUserId);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "failed-precondition",
      "Could not verify linked character.",
    );
  }

  if (!session.lastSeenAt || now - session.lastSeenAt > LAST_SEEN_WRITE_MS) {
    await sessionRef.update({
      lastSeenAt: now,
      roleIds: currentRoleIds,
      lodestoneId: character.lodestoneId,
      characterName: character.characterName,
      fcRank: character.fcRank,
      avatarUrl: character.avatarUrl,
      isMember: true,
      isAdmin,
    });
  }

  const appRoleIds = applyDevRoleOverride(currentRoleIds, config);
  const appIsAdmin = hasAnyRole(appRoleIds, adminRoleIds);

  return {
    ...session,
    ...character,
    roleIds: appRoleIds,
    isMember: true,
    isAdmin: appIsAdmin,
    sessionHash: session.sessionHash,
  };
}

export async function requireAdminSession(
  data: unknown,
  config: MemberSessionConfig,
): Promise<VerifiedAdminSession> {
  const session = await requireMemberSession(data, config);
  if (!session.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Boss or Underpaw Discord role required.",
    );
  }
  return session;
}

export async function getAdminSession(
  data: unknown,
  config: MemberSessionConfig,
): Promise<{
  ok: true;
  discordUserId: string;
  discordUsername: string | null;
  discordDisplayName: string | null;
  discordAvatarUrl: string | null;
  lodestoneId: string | null;
  characterName: string | null;
  fcRank: string | null;
  avatarUrl: string | null;
  roleIds: string[];
  isMember: boolean;
  isAdmin: boolean;
  isHousecat: boolean;
  expiresAt: number;
}> {
  const baseSession = await requireAuthenticatedSession(data);
  let memberSession: VerifiedAdminSession | null = null;
  try {
    memberSession = await requireMemberSession(data, config);
  } catch (error) {
    if (
      !(error instanceof HttpsError) ||
      error.code === "unauthenticated"
    ) {
      throw error;
    }
  }
  const session = memberSession ?? baseSession;
  const housecatRoleId = config.housecatRoleId?.trim();
  return {
    ok: true,
    discordUserId: session.discordUserId,
    discordUsername: session.discordUsername ?? null,
    discordDisplayName: session.discordDisplayName ?? null,
    discordAvatarUrl: session.discordAvatarUrl ?? null,
    lodestoneId: memberSession?.lodestoneId ?? null,
    characterName: memberSession?.characterName ?? null,
    fcRank: memberSession?.fcRank ?? null,
    avatarUrl: session.avatarUrl ?? null,
    roleIds: session.roleIds,
    isMember: memberSession !== null,
    isAdmin: memberSession?.isAdmin === true,
    isHousecat:
      memberSession !== null && housecatRoleId
        ? memberSession.roleIds.includes(housecatRoleId)
        : false,
    expiresAt: session.expiresAt,
  };
}

export async function logoutAdminSession(data: unknown): Promise<{ ok: true }> {
  const token = getSessionToken(data);
  await admin
    .database()
    .ref(`adminSessions/${hashToken(token)}`)
    .remove();
  return { ok: true };
}
