import { drawNamazuEffect, drawNamazuTarget, NAMAZU_EFFECTS, NAMAZU_TILES } from "./cartel-gil-rush-namazu";

export const GIL_RUSH_PATH = "events/cartelGilRush/current";
export const GIL_RUSH_PRIVATE_PATH = "cartelGilRushPrivate/current";
export type MinorityPrize = "300k" | "200k" | "100k" | "50k";
export interface MinorityAssignments {
  gameId: number;
  revision: number;
  locked: boolean;
  choices: { id: string; chest: number }[];
  prizes: MinorityPrize[];
}
export interface MinorityChestReveal {
  chest: number;
  playerIds: string[];
  prize: MinorityPrize | null;
  revealedAt: number;
}

export type MinigameKind = "trivia" | "minority" | "minority-draw" | "eorzeaguessr" | "marbles" | "deathroll";
export type TriviaTeam = "A" | "B";
export type SplitDecision = "split" | "steal";
export interface GilRushMinigame {
  id: number;
  kind: MinigameKind;
  teams: { id: string; team: TriviaTeam }[];
  questionWins: (TriviaTeam | null)[];
  triviaWinnings: { A: number; B: number } | null;
  chests: { id: string; chest: number }[] | null;
  chestReveals: MinorityChestReveal[];
  treasureAssignments?: { revision: number; choices: { id: string; chest: number }[] };
  minorityDrawWinner?: number | null;
}
export interface SplitResult {
  challenger: string;
  partner: string;
  challengerDecision: SplitDecision;
  partnerDecision: SplitDecision;
}
export interface SplitChallenge {
  id: number;
  challenger: string | null;
  partner: string | null;
}
export interface GilRushPlayer {
  id: string;
  name: string;
  rosterId?: string;
  avatarUrl: string | null;
  gilWon: number;
}
export interface NamazuEncounter {
  id: number;
  tile: number;
  effect: number;
  target: string | null;
  targetDraw: number;
  payout: { perPlayer: number; roll: number | null } | null;
}
export interface GilRushEvent {
  version: 1;
  revision: number;
  phase: "setup" | "live";
  players: GilRushPlayer[];
  minigame: GilRushMinigame | null;
  lastMinigameRound: number;
  splitResult: SplitResult | null;
  splitChallenge: SplitChallenge | null;
  splitPartners: { challenger: string; partner: string }[];
  namazu: NamazuEncounter | null;
  round: number;
}
export type GilRushAction =
  | { type: "add"; player: Omit<GilRushPlayer, "gilWon"> }
  | { type: "rename"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "start" }
  | { type: "start-minigame"; kind: MinigameKind }
  | { type: "end-minigame" }
  | { type: "shuffle-trivia"; gameId: number }
  | { type: "finalise-trivia"; gameId: number; winnings: { A: number; B: number } }
  | { type: "reveal-minority-chest"; gameId: number; chest: number }
  | { type: "resolve-minority-draw"; gameId: number; chest: number }
  | { type: "start-split" }
  | { type: "set-split-players"; challengeId: number; challenger: string | null; partner: string | null }
  | { type: "reveal-split"; challengeId: number; challengerDecision: SplitDecision; partnerDecision: SplitDecision }
  | { type: "clear-split" }
  | { type: "start-namazu"; tile: number }
  | { type: "reroll-namazu-target"; encounterId: number }
  | { type: "award-namazu-gil"; encounterId: number; roll: number }
  | { type: "clear-namazu"; encounterId: number }
  | { type: "set-round"; round: number }
  | { type: "set-gil"; id: string; gilWon: number }
  | { type: "reset" }
  | { type: "import"; event: unknown };

export class GilRushError extends Error {
  readonly code: "invalid-argument" | "failed-precondition" | "aborted";
  constructor(message: string, code: "invalid-argument" | "failed-precondition" | "aborted" = "invalid-argument") {
    super(message);
    this.code = code;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GilRushError("Event details are invalid.");
  return value as Record<string, unknown>;
}

function integer(value: unknown, minimum: number, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) throw new GilRushError(`${label} must be a ${minimum ? "positive" : "non-negative"} whole number.`);
  return Number(value);
}

function nameOf(value: unknown): string {
  if (typeof value !== "string") throw new GilRushError("Enter a character name.");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new GilRushError("Character names must contain 1 to 80 characters.");
  return name;
}

function idOf(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new GilRushError("Player details are invalid.");
  return value;
}

function teamOf(value: unknown): TriviaTeam {
  if (value !== "A" && value !== "B") throw new GilRushError("Choose team A or B.");
  return value;
}

function kindOf(value: unknown): MinigameKind {
  if (value !== "trivia" && value !== "minority" && value !== "minority-draw" && value !== "eorzeaguessr" && value !== "marbles" && value !== "deathroll") throw new GilRushError("Choose a minigame.");
  return value;
}

function decisionOf(value: unknown): SplitDecision {
  if (value !== "split" && value !== "steal") throw new GilRushError("Choose Split or Steal for both players.");
  return value;
}

function playerId(value: unknown, players: GilRushPlayer[]): string {
  const id = idOf(value);
  if (!players.some(p => p.id === id)) throw new GilRushError("Player not found.");
  return id;
}

function splitOf(value: unknown, players: GilRushPlayer[]): SplitResult {
  const data = record(value);
  const challenger = playerId(data.challenger, players), partner = playerId(data.partner, players);
  if (challenger === partner) throw new GilRushError("Choose two different players.");
  return { challenger, partner, challengerDecision: decisionOf(data.challengerDecision), partnerDecision: decisionOf(data.partnerDecision) };
}

function splitChallengeOf(value: unknown, players: GilRushPlayer[]): SplitChallenge | null {
  if (value == null) return null;
  const data = record(value);
  const challenger = data.challenger == null ? null : playerId(data.challenger, players);
  const partner = data.partner == null ? null : playerId(data.partner, players);
  if (partner && (!challenger || challenger === partner)) throw new GilRushError("Choose two different players.");
  return { id: integer(data.id, 1, "Challenge ID"), challenger, partner };
}

export function minorityChestCount(kind: MinigameKind) { return kind === "minority-draw" ? 3 : 4; }

function chestsOf(value: unknown, players: GilRushPlayer[], count = 4): { id: string; chest: number }[] {
  if (!Array.isArray(value) || value.length !== players.length) throw new GilRushError("Assign every player to a chest before revealing.");
  const choices = value.map(value => {
    const choice = record(value), chest = integer(choice.chest, 1, "Chest");
    if (chest > count) throw new GilRushError(`Choose one of ${count === 3 ? "three" : "four"} chests.`);
    return { id: playerId(choice.id, players), chest };
  });
  if (new Set(choices.map(c => c.id)).size !== choices.length) throw new GilRushError("Assign each player once.");
  return choices;
}

function prizeOf(value: unknown): MinorityPrize {
  if (value === "golden-dice") return "300k";
  if (value !== "300k" && value !== "200k" && value !== "100k" && value !== "50k") throw new GilRushError("Choose a chest prize.");
  return value;
}

export function requireMinorityGame(event: GilRushEvent, gameId: unknown): GilRushMinigame {
  const game = event.minigame;
  if (event.phase !== "live" || (game?.kind !== "minority" && game?.kind !== "minority-draw") || game.id !== gameId) throw new GilRushError("This chest minigame is no longer active.");
  return game;
}

export function readMinorityAssignments(value: unknown, event: GilRushEvent, gameId: number): MinorityAssignments | null {
  const game = requireMinorityGame(event, gameId);
  if (value == null) return null;
  const data = record(value);
  if (data.gameId !== gameId) return null;
  const rawPrizes = data.prizes ?? [];
  const draw = game.kind === "minority-draw";
  if (!Array.isArray(rawPrizes) || rawPrizes.length !== (draw ? 0 : 4)) throw new GilRushError(draw ? "Minority Draw does not use random chest prizes." : "Assign all four chest prizes.");
  const prizes = rawPrizes.map(prizeOf);
  if (!draw && new Set(prizes).size !== 4) throw new GilRushError("Use each chest prize once.");
  if (typeof data.locked !== "boolean") throw new GilRushError("Assignment lock is invalid.");
  return { gameId, revision: integer(data.revision, 1, "Assignment revision"), locked: data.locked, choices: chestsOf(data.choices, event.players, minorityChestCount(game.kind)), prizes };
}

export function nextMinorityAssignments(value: unknown, event: GilRushEvent, input: unknown, expectedRevision: unknown, random = Math.random): MinorityAssignments {
  const action = record(input), gameId = integer(action.gameId, 1, "Minigame ID");
  const game = requireMinorityGame(event, gameId);
  if (game.chestReveals.length) throw new GilRushError("Assignments are locked once revealing begins.");
  if (value != null && Number(record(value).gameId) > gameId) throw new GilRushError("A newer minigame has started.", "aborted");
  const current = readMinorityAssignments(value, event, gameId);
  if (current?.locked) throw new GilRushError("Assignments are locked once revealing begins.");
  const revision = current?.revision ?? 0;
  if (integer(expectedRevision, 0, "Assignment revision") !== revision) throw new GilRushError("Assignments changed on another host. Reload the saved assignments before retrying.", "aborted");
  if (revision === Number.MAX_SAFE_INTEGER) throw new GilRushError("Assignment revision limit reached.");
  const prizes: MinorityPrize[] = current ? [...current.prizes] : game.kind === "minority-draw" ? [] : ["300k", "200k", "100k", "50k"];
  if (!current) for (let index = prizes.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [prizes[index], prizes[other]] = [prizes[other], prizes[index]];
  }
  return readMinorityAssignments({ gameId, revision: revision + 1, locked: false, choices: action.choices, prizes }, event, gameId)!;
}

export function lockMinorityAssignments(value: unknown, event: GilRushEvent, gameId: number): MinorityAssignments {
  const current = readMinorityAssignments(value, event, gameId);
  if (!current) throw new GilRushError("Save all chest assignments before revealing.");
  return { ...current, locked: true };
}

export function publishTreasureAssignments(value: unknown, assignments: MinorityAssignments): GilRushEvent {
  const current = readGilRushEvent(value);
  const game = requireMinorityGame(current, assignments.gameId);
  if (game.kind !== "minority") throw new GilRushError("Treasure Draw assignments are required.");
  const saved = readMinorityAssignments(assignments, current, game.id)!;
  if ((game.treasureAssignments?.revision ?? 0) >= saved.revision) return current;
  if (game.chestReveals.some(row => {
    const ids = saved.choices.filter(choice => choice.chest === row.chest).map(choice => choice.id);
    return ids.length !== row.playerIds.length || row.playerIds.some(id => !ids.includes(id));
  })) throw new GilRushError("Assignments do not match the revealed chests.");
  if (current.revision === Number.MAX_SAFE_INTEGER) throw new GilRushError("Event revision limit reached.", "failed-precondition");
  return { ...current, revision: current.revision + 1, minigame: { ...game, treasureAssignments: { revision: saved.revision, choices: saved.choices } } };
}

function chestRevealsOf(value: unknown, players: GilRushPlayer[], kind: MinigameKind): MinorityChestReveal[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new GilRushError("Chest reveals are invalid.");
  const reveals = value.map(value => {
    const row = record(value), chest = integer(row.chest, 1, "Chest");
    if (chest > minorityChestCount(kind) || !Array.isArray(row.playerIds ?? []) || (kind === "minority-draw" && row.prize != null)) throw new GilRushError("Chest reveal is invalid.");
    return { chest, playerIds: ((row.playerIds ?? []) as unknown[]).map(id => playerId(id, players)), prize: row.prize == null || row.prize === "golden-dice" ? null : prizeOf(row.prize), revealedAt: integer(row.revealedAt, 0, "Reveal time") };
  });
  const ids = reveals.flatMap(row => row.playerIds);
  if (new Set(reveals.map(row => row.chest)).size !== reveals.length || new Set(ids).size !== ids.length) throw new GilRushError("Chest reveals contain duplicate entries.");
  return reveals;
}

function minigameOf(value: unknown, players: GilRushPlayer[]): GilRushMinigame | null {
  if (value === null || value === undefined) return null;
  const data = record(value), kind = kindOf(data.kind);
  const teams = data.teams ?? [];
  if (!Array.isArray(teams)) throw new GilRushError("Teams are invalid.");
  const mapped = teams.map(value => { const row = record(value); return { id: playerId(row.id, players), team: teamOf(row.team) }; });
  if (new Set(mapped.map(t => t.id)).size !== mapped.length) throw new GilRushError("Assign each player once.");
  const wins = data.questionWins ?? {};
  if (!wins || typeof wins !== "object" || (Array.isArray(wins) && wins.length > 5) || Object.keys(wins).some(key => !["0", "1", "2", "3", "4"].includes(key))) throw new GilRushError("Trivia has five questions.");
  // RTDB returns sparse arrays as numeric-keyed objects and omits all-null arrays.
  const results = wins as Record<number, unknown>;
  const questionWins = Array.from({ length: 5 }, (_, index) => results[index] == null ? null : teamOf(results[index]));
  const savedWinnings = data.triviaWinnings == null ? null : record(data.triviaWinnings);
  const triviaWinnings = savedWinnings ? { A: integer(savedWinnings.A, 0, "Team A winnings"), B: integer(savedWinnings.B, 0, "Team B winnings") }
    : kind === "trivia" && questionWins.some(Boolean) ? { A: questionWins.filter(team => team === "A").length * 100_000, B: questionWins.filter(team => team === "B").length * 100_000 } : null;
  const chests = data.chests == null ? null : chestsOf(data.chests, players, minorityChestCount(kind));
  const legacyReveals = chests ? Array.from({ length: minorityChestCount(kind) }, (_, index) => index + 1).map(chest => ({ chest, playerIds: chests.filter(choice => choice.chest === chest).map(choice => choice.id), prize: null, revealedAt: 0 })) : [];
  const chestReveals = chestRevealsOf(data.chestReveals ?? legacyReveals, players, kind);
  const savedAssignments = kind === "minority" && data.treasureAssignments != null ? record(data.treasureAssignments) : null;
  const treasureAssignments = savedAssignments ? { revision: integer(savedAssignments.revision, 1, "Assignment revision"), choices: chestsOf(savedAssignments.choices, players) } : undefined;
  if (kind === "minority-draw" && chestReveals.length === 3 && revealedChoices(chestReveals).length !== players.length) throw new GilRushError("Chest reveals must include every player.");
  const minorityDrawWinner = kind !== "minority-draw" || data.minorityDrawWinner == null ? null : integer(data.minorityDrawWinner, 1, "Winning chest");
  if (kind === "minority-draw" && minorityDrawWinner !== null && (chestReveals.length !== 3 || !minorityWinners(revealedChoices(chestReveals)).includes(minorityDrawWinner))) throw new GilRushError("Winning chest is invalid.");
  return { id: integer(data.id, 1, "Minigame ID"), kind, teams: mapped, questionWins, triviaWinnings, chests, chestReveals, ...(treasureAssignments ? { treasureAssignments } : {}), ...(kind === "minority-draw" ? { minorityDrawWinner } : {}) };
}

function revealedChoices(reveals: MinorityChestReveal[]) {
  return reveals.flatMap(row => row.playerIds.map(id => ({ id, chest: row.chest })));
}

export function splitPayouts(result: SplitResult): [number, number] {
  if (result.challengerDecision === result.partnerDecision) return result.challengerDecision === "split" ? [100_000, 100_000] : [0, 0];
  return result.challengerDecision === "steal" ? [200_000, 0] : [0, 200_000];
}

export function minorityWinners(choices: { id: string; chest: number }[]): number[] {
  const counts = [1, 2, 3, 4].map(chest => choices.filter(c => c.chest === chest).length);
  const minimum = Math.min(...counts.filter(count => count > 0));
  return counts.flatMap((count, index) => count === minimum ? [index + 1] : []);
}

function award(players: GilRushPlayer[], amounts: Map<string, number>): GilRushPlayer[] {
  return players.map(player => ({ ...player, gilWon: integer(player.gilWon + (amounts.get(player.id) ?? 0), 0, "Resulting gil total") }));
}

function awardMinorityDraw(players: GilRushPlayer[], reveals: MinorityChestReveal[], chest: number) {
  const ids = reveals.find(row => row.chest === chest)!.playerIds;
  return award(players, new Map(ids.map(id => [id, 300_000])));
}

function playerOf(value: unknown, importing = false): GilRushPlayer {
  const player = record(value);
  const avatarUrl = player.avatarUrl ?? null;
  if (avatarUrl !== null && (typeof avatarUrl !== "string" || !/^(https?:\/\/|\/(?!\/))/i.test(avatarUrl))) throw new GilRushError("Player avatar is invalid.");
  return {
    id: idOf(player.id), name: nameOf(player.name), avatarUrl,
    ...(player.rosterId === undefined ? {} : { rosterId: idOf(player.rosterId) }),
    gilWon: importing ? 0 : integer(player.gilWon, 0, "Gil"),
  };
}

function checkUnique(players: GilRushPlayer[]): void {
  for (const values of [players.map(p => p.id), players.map(p => p.name.toLowerCase()), players.flatMap(p => p.rosterId ? [p.rosterId] : [])]) {
    if (new Set(values).size !== values.length) throw new GilRushError("That player is already on the list.");
  }
}

function namazuOf(value: unknown, players: GilRushPlayer[]): NamazuEncounter | null {
  if (value == null) return null;
  const data = record(value);
  const tile = integer(data.tile, 1, "Namazu tile");
  if (!(NAMAZU_TILES as readonly number[]).includes(tile)) throw new GilRushError("Choose a Namazu tile.");
  const effect = integer(data.effect, 1, "Namazu effect");
  if (effect > NAMAZU_EFFECTS.length) throw new GilRushError("Invalid Namazu effect.");
  const target = data.target == null ? null : playerId(data.target, players);
  const targetDraw = integer(data.targetDraw ?? 0, 0, "Namazu target draw");
  const randomTarget = effect === 5 || effect === 6 || effect === 8;
  if ((!randomTarget && (target !== null || targetDraw !== 0)) || (randomTarget && targetDraw === 0 && target !== null)) throw new GilRushError("Invalid Namazu target.");
  if ((effect === 5 || effect === 8) && targetDraw > 0 && target === null) throw new GilRushError("Choose a Namazu target.");
  if (effect === 6 && ((players.length > 1 && targetDraw > 0 && target === null) || (players.length < 2 && target !== null))) throw new GilRushError("Invalid swap selection.");
  let payout: NamazuEncounter["payout"] = null;
  if (data.payout != null) {
    const receipt = record(data.payout);
    const roll = receipt.roll == null ? null : integer(receipt.roll, 1, "Namazu roll");
    const perPlayer = integer(receipt.perPlayer, 1, "Namazu payout");
    if (effect === 3 ? perPlayer !== 50_000 || roll !== null : effect !== 7 || roll === null || roll > 6 || perPlayer !== roll * 10_000) throw new GilRushError("Invalid Namazu payout receipt.");
    payout = { perPlayer, roll };
  }
  return { id: integer(data.id, 1, "Namazu encounter"), tile, effect, target, targetDraw, payout };
}

export function emptyGilRushEvent(): GilRushEvent {
  return { version: 1, revision: 0, phase: "setup", players: [], round: 1, minigame: null, lastMinigameRound: 0, splitResult: null, splitChallenge: null, splitPartners: [], namazu: null };
}

export function readGilRushEvent(value: unknown, importing = false): GilRushEvent {
  if (value === null || value === undefined) {
    if (importing) throw new GilRushError("Local event is invalid.");
    return emptyGilRushEvent();
  }
  const data = record(value);
  if (data.version !== 1 || (data.phase !== "setup" && data.phase !== "live")) throw new GilRushError("Saved event is invalid.");
  // RTDB omits empty arrays and null fields from snapshots.
  const rawPlayers = data.players ?? [];
  if (!Array.isArray(rawPlayers)) throw new GilRushError("Saved players are invalid.");
  const players = rawPlayers.map(p => playerOf(p, importing));
  checkUnique(players);
  const round = integer(data.round, 1, "Round");
  if ((data.phase === "setup" && (round !== 1 || players.some(p => p.gilWon !== 0))) || (data.phase === "live" && !players.length)) throw new GilRushError("Saved event is invalid.");
  const splitPartners = importing ? [] : data.splitPartners ?? [];
  if (!Array.isArray(splitPartners)) throw new GilRushError("Previous partners are invalid.");
  return { version: 1, revision: importing ? 0 : integer(data.revision, 0, "Revision"), phase: data.phase, players, round,
    minigame: importing ? null : minigameOf(data.minigame, players), lastMinigameRound: importing ? 0 : integer(data.lastMinigameRound ?? 0, 0, "Minigame round"),
    splitResult: importing || data.splitResult == null ? null : splitOf(data.splitResult, players),
    splitChallenge: importing ? null : splitChallengeOf(data.splitChallenge, players),
    namazu: importing ? null : namazuOf(data.namazu, players),
    splitPartners: splitPartners.map(value => { const row = record(value); return { challenger: playerId(row.challenger, players), partner: playerId(row.partner, players) }; }),
  };
}

export function isEmptyGilRushEvent(event: GilRushEvent): boolean {
  return event.phase === "setup" && !event.players.length && event.round === 1;
}

export function nextGilRushEvent(value: unknown, input: unknown, expectedRevision: unknown, random = Math.random, minority?: MinorityAssignments, now = Date.now()): GilRushEvent {
  const current = readGilRushEvent(value);
  const expected = integer(expectedRevision, 0, "Revision");
  if (current.revision !== expected) throw new GilRushError("Event changed on another host. Review latest values and retry.", "aborted");
  if (current.revision === Number.MAX_SAFE_INTEGER) throw new GilRushError("Event revision limit reached.", "failed-precondition");
  const action = record(input);
  let next = { ...current, players: [...current.players], revision: current.revision + 1 };
  if (action.type === "reset") return { ...emptyGilRushEvent(), revision: next.revision };
  if (action.type === "import") {
    if (!isEmptyGilRushEvent(current)) throw new GilRushError("Import requires an empty shared event.", "failed-precondition");
    return { ...readGilRushEvent(action.event, true), revision: next.revision };
  }
  if (["start-minigame", "end-minigame", "shuffle-trivia", "finalise-trivia", "reveal-minority-chest", "resolve-minority-draw", "start-split", "set-split-players", "reveal-split", "clear-split", "start-namazu", "reroll-namazu-target", "award-namazu-gil", "clear-namazu"].includes(String(action.type))) {
    if (current.phase !== "live") throw new GilRushError("Start the event first.", "failed-precondition");
    if (action.type === "start-namazu") {
      if (current.namazu) throw new GilRushError("Clear the current Namazu encounter first.");
      const effect = drawNamazuEffect(random);
      const payout = effect === 3 ? { perPlayer: 50_000, roll: null } : null;
      next.namazu = namazuOf({ id: next.revision, tile: action.tile, effect, target: null, targetDraw: 0, payout }, current.players);
      if (payout) next.players = award(current.players, new Map(current.players.map(player => [player.id, payout.perPlayer])));
    } else if (action.type === "reroll-namazu-target" || action.type === "award-namazu-gil" || action.type === "clear-namazu") {
      const encounter = current.namazu;
      if (!encounter || action.encounterId !== encounter.id) throw new GilRushError("This Namazu encounter is no longer active.");
      if (action.type === "clear-namazu") next.namazu = null;
      else if (action.type === "award-namazu-gil") {
        if (encounter.effect !== 7) throw new GilRushError("Only the /random 6 effect needs a roll payout.");
        if (encounter.payout) throw new GilRushError("Namazu gil has already been awarded.");
        const roll = integer(action.roll, 1, "Namazu roll");
        if (roll > 6) throw new GilRushError("Enter a /random 6 result from 1 to 6.");
        const perPlayer = roll * 10_000;
        next.players = award(current.players, new Map(current.players.map(player => [player.id, perPlayer])));
        next.namazu = { ...encounter, payout: { perPlayer, roll } };
      }
      else {
        if (![5, 6, 8].includes(encounter.effect)) throw new GilRushError("This effect has no player selection to reroll.");
        if (encounter.effect === 6 && current.players.length < 2) throw new GilRushError("No other player is available.");
        const target = drawNamazuTarget(encounter.effect, current.players.map(player => player.id), random);
        next.namazu = { ...encounter, target, targetDraw: integer(encounter.targetDraw + 1, 1, "Namazu target draw") };
      }
    } else if (action.type === "start-minigame") {
      if (current.minigame) throw new GilRushError("End the current minigame first.");
      const kind = kindOf(action.kind);
      next.minigame = { id: next.revision, kind, teams: [], questionWins: [null, null, null, null, null], triviaWinnings: null, chests: null, chestReveals: [], ...(kind === "minority-draw" ? { minorityDrawWinner: null } : {}) };
      next.lastMinigameRound = current.round;
    } else if (action.type === "end-minigame") {
      next.minigame = null;
    } else if (action.type === "resolve-minority-draw") {
      const game = requireMinorityGame(current, action.gameId);
      if (game.kind !== "minority-draw") throw new GilRushError("Start Minority Draw first.");
      if (game.chestReveals.length !== 3) throw new GilRushError("Reveal all three chests first.");
      if (game.minorityDrawWinner != null) throw new GilRushError("Minority Draw winnings are already awarded.");
      const tied = minorityWinners(revealedChoices(game.chestReveals));
      const chest = integer(action.chest, 1, "Winning chest");
      if (tied.length < 2 || !tied.includes(chest)) throw new GilRushError("Choose a tied least-selected occupied chest after Chow's deathroll.");
      next.players = awardMinorityDraw(current.players, game.chestReveals, chest);
      next.minigame = { ...game, minorityDrawWinner: chest };
    } else if (action.type === "start-split") {
      if (current.players.length < 2) throw new GilRushError("Split or Steal needs at least two players.");
      if (current.splitChallenge || current.splitResult) throw new GilRushError("Clear the previous challenge first.");
      next.splitChallenge = { id: next.revision, challenger: null, partner: null };
    } else if (action.type === "set-split-players" || action.type === "reveal-split") {
      if (current.splitResult) throw new GilRushError("Clear the previous result before revealing a new challenge.");
      const challenge = current.splitChallenge;
      if (!challenge || action.challengeId !== challenge.id) throw new GilRushError("This Split or Steal challenge is no longer active.");
      if (action.type === "set-split-players" && (action.challenger === undefined || action.partner === undefined)) throw new GilRushError("Choose players or explicitly clear their selection.");
      const pair = action.type === "set-split-players" ? splitChallengeOf({ id: challenge.id, challenger: action.challenger, partner: action.partner }, current.players)! : challenge;
      if (current.splitPartners.some(p => p.challenger === pair.challenger && p.partner === pair.partner)) throw new GilRushError("This player has already chosen that partner.");
      if (action.type === "set-split-players") {
        next.splitChallenge = pair;
      } else {
        if (!pair.challenger || !pair.partner) throw new GilRushError("Choose both players before revealing.");
        const result = splitOf({ ...pair, challengerDecision: action.challengerDecision, partnerDecision: action.partnerDecision }, current.players);
        const payouts = splitPayouts(result);
        next.players = award(current.players, new Map([[result.challenger, payouts[0]], [result.partner, payouts[1]]]));
        next.splitResult = result;
        next.splitPartners = [...current.splitPartners, { challenger: result.challenger, partner: result.partner }];
      }
    } else if (action.type === "clear-split") {
      next.splitResult = null;
      next.splitChallenge = null;
    } else {
      const game = current.minigame;
      if (!game) throw new GilRushError("Start a minigame first.");
      if (action.type === "reveal-minority-chest") {
        requireMinorityGame(current, action.gameId);
        const chest = integer(action.chest, 1, "Chest");
        if (chest > minorityChestCount(game.kind) || game.chestReveals.some(row => row.chest === chest)) throw new GilRushError("This chest reveal is no longer available.");
        const saved = readMinorityAssignments(minority, current, game.id);
        if (!saved?.locked) throw new GilRushError("Save and lock chest assignments before revealing.");
        const playerIds = saved.choices.filter(choice => choice.chest === chest).map(choice => choice.id);
        const draw = game.kind === "minority-draw";
        const prize = draw ? null : saved.prizes[chest - 1];
        if (draw) {
          next.minigame = { ...game, minorityDrawWinner: null, chestReveals: [...game.chestReveals, { chest, playerIds, prize, revealedAt: integer(now, 0, "Reveal time") }] };
          if (next.minigame.chestReveals.length === 3) {
            const winners = minorityWinners(saved.choices);
            if (winners.length === 1) {
              next.players = awardMinorityDraw(current.players, next.minigame.chestReveals, winners[0]);
              next.minigame.minorityDrawWinner = winners[0];
            }
          }
        } else {
          const amount = prize === "300k" ? 300_000 : prize === "200k" ? 200_000 : prize === "100k" ? 100_000 : 50_000;
          next.players = award(current.players, new Map(playerIds.map(id => [id, amount])));
        }
        if (!draw) {
          if ((game.treasureAssignments?.revision ?? 0) > saved.revision) throw new GilRushError("Assignments changed before revealing.", "aborted");
          next.minigame = { ...game, treasureAssignments: { revision: saved.revision, choices: saved.choices }, chestReveals: [...game.chestReveals, { chest, playerIds, prize, revealedAt: integer(now, 0, "Reveal time") }] };
        }
      } else {
        if (game.kind !== "trivia") throw new GilRushError("Start Group Trivia first.");
        if (action.gameId !== game.id) throw new GilRushError("This trivia game is no longer active.");
        if (game.triviaWinnings) throw new GilRushError("This trivia game is already finalised.");
        if (action.type === "shuffle-trivia") {
          if (current.players.length < 2) throw new GilRushError("Trivia needs at least two players.");
          const shuffled = [...current.players];
          for (let index = shuffled.length - 1; index > 0; index--) {
            const other = Math.floor(random() * (index + 1));
            [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
          }
          next.minigame = { ...game, teams: shuffled.map((player, index) => ({ id: player.id, team: index < Math.ceil(shuffled.length / 2) ? "A" : "B" })) };
        } else {
          if (game.teams.length !== current.players.length || !["A", "B"].every(t => game.teams.some(row => row.team === t))) throw new GilRushError("Shuffle players into two teams before finalising.");
          const winnings = record(action.winnings);
          const triviaWinnings = { A: integer(winnings.A, 0, "Team A winnings"), B: integer(winnings.B, 0, "Team B winnings") };
          next.players = award(current.players, new Map(game.teams.map(row => [row.id, triviaWinnings[row.team]])));
          next.minigame = { ...game, triviaWinnings };
        }
      }
    }
  } else if (action.type === "set-round" || action.type === "set-gil") {
    if (current.phase !== "live") throw new GilRushError("Start the event first.", "failed-precondition");
    if (action.type === "set-round") next.round = integer(action.round, 1, "Round");
    else {
      const id = idOf(action.id);
      if (!current.players.some(p => p.id === id)) throw new GilRushError("Player not found.");
      const gilWon = integer(action.gilWon, 0, "Gil");
      next.players = current.players.map(p => p.id === id ? { ...p, gilWon } : p);
    }
  } else {
    if (current.phase === "live") throw new GilRushError("Player order is locked. Reset the event to change players.", "failed-precondition");
    if (action.type === "start") {
      if (!current.players.length) throw new GilRushError("Add at least one player first.");
      for (let index = next.players.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [next.players[index], next.players[other]] = [next.players[other], next.players[index]];
      }
      next = { ...next, phase: "live", round: 1 };
    } else if (action.type === "add") {
      next.players.push(playerOf(action.player, true));
      checkUnique(next.players);
    } else if (action.type === "remove" || action.type === "rename") {
      const id = idOf(action.id);
      const player = current.players.find(p => p.id === id);
      if (!player) throw new GilRushError("Player not found.");
      if (action.type === "remove") next.players = current.players.filter(p => p.id !== id);
      else {
        if (player.rosterId) throw new GilRushError("Remove and add the roster member again to refresh their name.");
        const name = nameOf(action.name);
        next.players = current.players.map(p => p.id === id ? { ...p, name } : p);
        checkUnique(next.players);
      }
    } else throw new GilRushError("Event action is invalid.");
  }
  return next;
}
