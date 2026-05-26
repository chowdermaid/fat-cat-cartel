import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const SESSION_HOURS = 730;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;
const OAUTH_STATE_MS = 10 * 60 * 1000;
const LAST_SEEN_WRITE_MS = 5 * 60 * 1000;
const STATE_COOKIE = "fcc_admin_oauth_state";
const DEFAULT_RETURN_TO = "/admin";

export interface AdminAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  guildId: string;
  adminRoleIds: string;
  botToken: string;
  appOrigin: string;
}

export interface AdminSession {
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  roleIds: string[];
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
}

interface DiscordGuildMember {
  roles?: unknown;
  user?: DiscordUser;
}

export interface VerifiedAdminSession extends AdminSession {
  sessionHash: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function parseRoleIds(value: string): string[] {
  return value
    .split(",")
    .map((roleId) => roleId.trim())
    .filter(Boolean);
}

function hasAdminRole(memberRoles: string[], adminRoleIds: string[]): boolean {
  const memberRoleSet = new Set(memberRoles);
  return adminRoleIds.some((roleId) => memberRoleSet.has(roleId));
}

function getSessionToken(data: unknown): string {
  const token = typeof data === "object" && data
    ? (data as { adminSessionToken?: unknown }).adminSessionToken
    : null;
  if (typeof token !== "string" || token.length < 32) {
    throw new HttpsError("unauthenticated", "Admin session is required.");
  }
  return token;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function redirectUrl(appOrigin: string, params: Record<string, string>): string {
  const url = new URL("/admin", appOrigin);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}

function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

function redirectToApp(appOrigin: string, returnTo: string, params: Record<string, string>): string {
  const url = new URL(safeReturnTo(returnTo), appOrigin);
  url.hash = new URLSearchParams(params).toString();
  return url.toString();
}

function cookieIsSecure(config: AdminAuthConfig): boolean {
  return config.redirectUri.startsWith("https://") && config.appOrigin.startsWith("https://");
}

function cookieValue(req: { cookies?: Record<string, string>; headers?: Record<string, unknown> }, name: string): string {
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
    throw new Error(`Discord request failed: ${response.status} ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

async function fetchCurrentUser(accessToken: string): Promise<DiscordUser> {
  return discordJson<DiscordUser>(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchCurrentUserGuildMember(accessToken: string, guildId: string): Promise<DiscordGuildMember> {
  return discordJson<DiscordGuildMember>(`${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchGuildMemberWithBot(botToken: string, guildId: string, discordUserId: string): Promise<DiscordGuildMember> {
  return discordJson<DiscordGuildMember>(`${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
}

function memberRoleIds(member: DiscordGuildMember): string[] {
  return Array.isArray(member.roles)
    ? member.roles.filter((roleId): roleId is string => typeof roleId === "string")
    : [];
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
    throw new HttpsError("failed-precondition", "Link your Lodestone profile first with the Discord /link command.");
  }

  const memberSnapshot = await db.ref(`members/${link.lodestoneId}`).get();
  const member = memberSnapshot.val() as {
    name?: unknown;
    fcRank?: unknown;
    avatarUrl?: unknown;
  } | null;
  if (!member || typeof member.name !== "string" || !member.name.trim()) {
    throw new HttpsError("failed-precondition", "Your linked character is no longer tracked.");
  }

  return {
    lodestoneId: link.lodestoneId,
    characterName: member.name.trim(),
    fcRank: typeof member.fcRank === "string" && member.fcRank.trim() ? member.fcRank.trim() : null,
    avatarUrl: typeof member.avatarUrl === "string" && member.avatarUrl.trim() ? member.avatarUrl.trim() : null,
  };
}

async function exchangeCode(config: AdminAuthConfig, code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const token = await discordJson<DiscordTokenResponse>(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!token.access_token) {
    throw new Error("Discord did not return an access token.");
  }
  return token.access_token;
}

export async function startDiscordAdminOAuth(
  config: AdminAuthConfig,
  req: { query: Record<string, unknown> },
  res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void; redirect: (url: string) => void },
): Promise<void> {
  const state = randomToken(24);
  const stateHash = hashToken(state);
  const now = Date.now();
  await admin.database().ref(`adminOAuthStates/${stateHash}`).set({
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
  req: { query: Record<string, unknown>; cookies?: Record<string, string>; headers?: Record<string, unknown> },
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
    res.redirect(redirectUrl(config.appOrigin, { admin_error: "invalid_state" }));
    return;
  }

  const stateHash = hashToken(state);
  const stateRef = admin.database().ref(`adminOAuthStates/${stateHash}`);
  const stateSnap = await stateRef.get();
  await stateRef.remove();
  const storedState = stateSnap.val() as { expiresAt?: unknown; returnTo?: unknown } | null;
  if (!storedState || typeof storedState.expiresAt !== "number" || storedState.expiresAt <= Date.now()) {
    res.redirect(redirectUrl(config.appOrigin, { admin_error: "invalid_state" }));
    return;
  }
  const returnTo = safeReturnTo(storedState.returnTo);

  try {
    const accessToken = await exchangeCode(config, code);
    const [user, member] = await Promise.all([
      fetchCurrentUser(accessToken),
      fetchCurrentUserGuildMember(accessToken, config.guildId),
    ]);
    const discordUserId = user.id;
    const roleIds = memberRoleIds(member);
    if (!discordUserId || !hasAdminRole(roleIds, parseRoleIds(config.adminRoleIds))) {
      res.redirect(redirectToApp(config.appOrigin, returnTo, { admin_error: "unauthorized" }));
      return;
    }

    let character: Awaited<ReturnType<typeof linkedCharacter>>;
    try {
      character = await linkedCharacter(discordUserId);
    } catch (error) {
      if (error instanceof HttpsError && error.message.includes("Link your Lodestone")) {
        res.redirect(redirectToApp(config.appOrigin, returnTo, { admin_error: "not_linked" }));
        return;
      }
      if (error instanceof HttpsError && error.message.includes("no longer tracked")) {
        res.redirect(redirectToApp(config.appOrigin, returnTo, { admin_error: "missing_member" }));
        return;
      }
      throw error;
    }

    const sessionToken = randomToken(48);
    const sessionHash = hashToken(sessionToken);
    const now = Date.now();
    await admin.database().ref(`adminSessions/${sessionHash}`).set({
      discordUserId,
      lodestoneId: character.lodestoneId,
      characterName: character.characterName,
      fcRank: character.fcRank,
      avatarUrl: character.avatarUrl,
      roleIds,
      createdAt: now,
      expiresAt: now + SESSION_MS,
      lastSeenAt: now,
    });

    res.redirect(redirectToApp(config.appOrigin, returnTo, { admin_session: sessionToken }));
  } catch (error) {
    console.error("Discord admin OAuth failed", error);
    res.redirect(redirectToApp(config.appOrigin, returnTo, { admin_error: "oauth_failed" }));
  }
}

export async function requireAdminSession(data: unknown, config: Pick<AdminAuthConfig, "guildId" | "adminRoleIds" | "botToken">): Promise<VerifiedAdminSession> {
  const token = getSessionToken(data);
  const sessionHash = hashToken(token);
  const sessionRef = admin.database().ref(`adminSessions/${sessionHash}`);
  const snapshot = await sessionRef.get();
  const session = snapshot.val() as AdminSession | null;
  const now = Date.now();

  if (!session?.discordUserId || typeof session.expiresAt !== "number" || session.expiresAt <= now) {
    await sessionRef.remove();
    throw new HttpsError("unauthenticated", "Admin session expired.");
  }

  let currentRoleIds: string[];
  try {
    currentRoleIds = memberRoleIds(
      await fetchGuildMemberWithBot(config.botToken, config.guildId, session.discordUserId),
    );
  } catch (error) {
    await sessionRef.remove();
    throw new HttpsError("permission-denied", "Could not verify Discord guild membership.");
  }

  if (!hasAdminRole(currentRoleIds, parseRoleIds(config.adminRoleIds))) {
    await sessionRef.remove();
    throw new HttpsError("permission-denied", "Boss or Underpaw Discord role required.");
  }

  let character: Awaited<ReturnType<typeof linkedCharacter>>;
  try {
    character = await linkedCharacter(session.discordUserId);
  } catch (error) {
    await sessionRef.remove();
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("failed-precondition", "Could not verify linked character.");
  }

  if (!session.lastSeenAt || now - session.lastSeenAt > LAST_SEEN_WRITE_MS) {
    await sessionRef.update({
      lastSeenAt: now,
      roleIds: currentRoleIds,
      lodestoneId: character.lodestoneId,
      characterName: character.characterName,
      fcRank: character.fcRank,
      avatarUrl: character.avatarUrl,
    });
  }

  return { ...session, ...character, roleIds: currentRoleIds, sessionHash };
}

export async function getAdminSession(data: unknown, config: Pick<AdminAuthConfig, "guildId" | "adminRoleIds" | "botToken">): Promise<{
  ok: true;
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  roleIds: string[];
  expiresAt: number;
}> {
  const session = await requireAdminSession(data, config);
  return {
    ok: true,
    discordUserId: session.discordUserId,
    lodestoneId: session.lodestoneId,
    characterName: session.characterName,
    fcRank: session.fcRank,
    avatarUrl: session.avatarUrl ?? null,
    roleIds: session.roleIds,
    expiresAt: session.expiresAt,
  };
}

export async function logoutAdminSession(data: unknown): Promise<{ ok: true }> {
  const token = getSessionToken(data);
  await admin.database().ref(`adminSessions/${hashToken(token)}`).remove();
  return { ok: true };
}
