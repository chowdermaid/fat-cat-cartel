import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
  ssr: { noExternal: ["react"] },
  plugins: [{ name: "minigame-host-harness", enforce: "pre",
    resolveId(id) { if (id === "react") return "\0host-react"; if (id.startsWith("react/")) return "\0host-jsx"; },
    load(id) {
      if (id === "\0host-react") return "export const useState = initial => globalThis.minigameHarness.useState(initial); export const useEffect = () => {};";
      if (id === "\0host-jsx") return "export const jsxDEV = (type, props, key) => ({ type, props, key }); export const jsx = jsxDEV; export const jsxs = jsxDEV;";
      const name = id.replaceAll("\\", "/");
      if (name.endsWith("/hooks/useMinorityAssignments.ts")) return "export const useMinorityAssignments = () => globalThis.minigameHarness.privateState;";
      if (name.endsWith("/components/ui/button.tsx")) return 'export const Button = "button";';
      if (name.endsWith("/components/ui/input.tsx")) return 'export const Input = "input";';
      if (name.endsWith("/components/ui/dialog.tsx")) return 'export const Dialog = "dialog"; export const DialogContent = "dialog-content"; export const DialogDescription = "description"; export const DialogHeader = "header"; export const DialogTitle = "title"; export const DialogTrigger = "trigger";';
      if (name.endsWith("/components/ui/popover.tsx")) return 'export const Popover = "popover"; export const PopoverContent = "popover-content"; export const PopoverTrigger = "trigger";';
      if (name.endsWith("/components/ui/scroll-area.tsx")) return 'export const ScrollArea = "scroll-area";';
      if (name.endsWith("/game/HostSelect.tsx")) return 'export const HostSelect = "host-select";';
      if (name.endsWith("/game/PlayerAvatar.tsx")) return 'export const PlayerAvatar = "player-avatar";';
    },
  }],
});
const { MinorityGame } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/MinorityGame.tsx");
const { SplitOrSteal } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/SplitOrSteal.tsx");
const { TriviaGame } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/TriviaGame.tsx");
const { MinigamePanel } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/MinigamePanel.tsx");
const { NamazuPanel } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/NamazuPanel.tsx");
const { NAMAZU_EFFECTS } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-namazu.ts");
const { chestRevealProgress, chestRevealStepTime, CHEST_OPENING_DURATION, CHEST_REVEAL_INTERVAL, CHEST_PRIZE_PAUSE } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/minorityReveal.ts");
const { emptyGilRushEvent } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-model.ts");
after(async () => { await server.close(); delete globalThis.minigameHarness; });

const players = ["Axo", "Chow", "Finished Racer"].map(id => ({ id, name: id, avatarUrl: null, gilWon: 0 }));
const event = () => ({ ...emptyGilRushEvent(), phase: "live", players, revision: 8 });
function descendants(element) {
  if (!element || typeof element !== "object") return [];
  if (element.type?.name === "SplitParticipant") return descendants(element.type(element.props));
  return [element, ...[element.props?.children, element.props?.actions].flat(Infinity).flatMap(descendants)];
}
function mount(Component, props) {
  let cursor = 0;
  const slots = [], calls = [], privateRequests = [];
  let success = true;
  const privateState = { saved: null, loading: false, pending: false, error: null,
    async save(choices, revision) {
      privateRequests.push({ choices, revision });
      if (!success) { this.error = "Could not save assignments."; return false; }
      this.saved = { gameId: props.current?.minigame?.id, revision: revision + 1, locked: false, choices, prizes: props.current?.minigame?.kind === "minority-draw" ? [] : ["300k", "200k", "100k", "50k"] };
      this.error = null;
      return true;
    }, async reload() { return true; },
  };
  globalThis.minigameHarness = { privateState, useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  } };
  const run = async (action, revision) => { calls.push({ action, revision }); return success; };
  const render = () => { cursor = 0; return Component({ canEdit: true, ...props, run, disabled: false }); };
  const find = predicate => descendants(render()).find(predicate);
  return { calls, privateRequests, privateState, render, find, props, setSuccess: value => { success = value; } };
}

test("reminders start at rounds 6, 12 and 18, are host-only and never start a game automatically", async () => {
  const current = event();
  const host = mount(MinigamePanel, { current });
  const reminder = () => host.find(node => node.props?.["aria-label"] === "Group minigame reminder");
  for (const round of [1, 5]) {
    current.round = round;
    assert.equal(reminder(), undefined);
  }
  for (const round of [6, 7, 11, 12, 13, 18, 19]) {
    current.round = round;
    assert.ok(reminder());
    assert.equal(current.minigame, null);
    assert.equal(host.calls.length, 0);
  }
  for (const [round, lastMinigameRound] of [[6, 6], [7, 6], [7, 7], [11, 7], [12, 12], [18, 18], [19, 18]]) {
    Object.assign(current, { round, lastMinigameRound });
    assert.equal(reminder(), undefined);
  }
  Object.assign(current, { round: 13, lastMinigameRound: 7 });
  assert.ok(reminder());
  host.find(node => node.type === "host-select").props.onChange("marbles");
  assert.equal(host.calls.length, 0);
  await host.find(node => node.props?.children === "Start minigame").props.onClick();
  assert.deepEqual(host.calls, [{ action: { type: "start-minigame", kind: "marbles" }, revision: undefined }]);
  const viewer = mount(MinigamePanel, { current, canEdit: false });
  assert.equal(viewer.find(node => node.props?.["aria-label"] === "Group minigame reminder"), undefined);
  assert.equal(viewer.find(node => node.type === "host-select"), undefined);
});

test("a running minigame suppresses reminders without replacing it", () => {
  for (const kind of ["trivia", "minority", "minority-draw", "eorzeaguessr", "marbles", "deathroll"]) {
    const current = { ...event(), round: 13, minigame: { id: 7, kind } };
    const host = mount(MinigamePanel, { current });
    assert.equal(host.find(node => node.props?.["aria-label"] === "Group minigame reminder"), undefined);
    assert.equal(host.calls.length, 0);
    assert.equal(current.minigame.kind, kind);
  }
});

test("Namazu renders descriptions without effect titles or a landing picker and rerolls only the player", async () => {
  const current = { ...event(), namazu: { id: 7, tile: 16, effect: 6, target: null, targetDraw: 0, payout: null } };
  const host = mount(NamazuPanel, { current });
  assert.equal(host.find(node => node.type === "host-select"), undefined);
  assert.equal(host.find(node => node.type?.name === "RuleText").props.text, NAMAZU_EFFECTS[5]);
  assert.equal(host.calls.length, 0);
  assert.equal(host.find(node => node.type?.name === "PlayerAvatar"), undefined);
  await host.find(node => node.props?.children?.includes?.("Randomise player")).props.onClick();
  assert.deepEqual(host.calls.at(-1), { action: { type: "reroll-namazu-target", encounterId: 7 }, revision: 8 });
  current.namazu = { ...current.namazu, target: "Axo", targetDraw: 1 };
  await host.find(node => node.props?.children?.includes?.("Reroll player")).props.onClick();
  assert.deepEqual(host.calls.at(-1), { action: { type: "reroll-namazu-target", encounterId: 7 }, revision: 8 });
  assert.equal(current.namazu.effect, 6);
  const viewer = mount(NamazuPanel, { current, canEdit: false });
  assert.equal(descendants(viewer.render()).filter(node => node.type === "button").length, 0);
  const saving = mount(NamazuPanel, { current, saving: true });
  assert.ok(descendants(saving.render()).filter(node => node.type === "button").every(node => node.props.disabled));
  current.players = [players[0]];
  current.namazu = { ...current.namazu, target: null };
  assert.equal(host.find(node => node.props?.children?.includes?.("Randomise player")).props.disabled, true);
  assert.equal(host.find(node => node.props?.children?.includes?.("Reroll player")), undefined);
  await host.find(node => node.props?.children === "End event").props.onClick();
  assert.deepEqual(host.calls.at(-1).action, { type: "clear-namazu", encounterId: 7 });
  current.namazu = null;
  assert.equal(host.render(), null);
});

test("Namazu roll payouts wait for a valid host result, preserve failed drafts and lock after payment", async () => {
  const current = { ...event(), namazu: { id: 7, tile: 16, effect: 7, target: null, targetDraw: 0, payout: null } };
  const host = mount(NamazuPanel, { current });
  const input = () => host.find(node => node.type === "input");
  const submit = () => host.find(node => node.type === "button" && node.props.type === "submit");
  const form = () => host.find(node => node.type === "form");
  assert.equal(submit().props.disabled, true);
  input().props.onChange({ target: { value: "7" } });
  await form().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.length, 0);
  input().props.onChange({ target: { value: "3" } });
  assert.equal(submit().props.disabled, false);
  host.setSuccess(false);
  await form().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(host.calls.at(-1), { action: { type: "award-namazu-gil", encounterId: 7, roll: 3 }, revision: 8 });
  assert.equal(input().props.value, "3");
  current.namazu.payout = { perPlayer: 30_000, roll: 3 };
  assert.equal(input().props.disabled, true);
  assert.equal(submit().props.disabled, true);
  const calls = host.calls.length;
  await form().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.length, calls);
  const viewer = mount(NamazuPanel, { current, canEdit: false });
  assert.equal(descendants(viewer.render()).filter(node => node.type === "input" || node.type === "button").length, 0);
  for (const effect of [2, 3]) {
    const other = mount(NamazuPanel, { current: { ...current, namazu: { ...current.namazu, effect, payout: effect === 3 ? { perPlayer: 50_000, roll: null } : null } } });
    assert.equal(other.find(node => node.type === "form"), undefined);
  }
});

test("chest assignment drafts retain failures and keep prize reveals separate", async () => {
  const current = { ...event(), minigame: { id: 7, kind: "minority", teams: [], chests: null, chestReveals: [] } };
  const host = mount(MinorityGame, { current });
  const save = () => host.find(node => node.props?.children === "Save assignments");
  const chest = number => host.find(node => node.type?.name === "MinorityChest" && node.props.chest === number);
  assert.equal(save().props.disabled, true);
  assert.equal(chest(1).props.disabled, true);
  for (const [id, number] of [["Axo", 2], ["Chow", 2], ["Finished Racer", 4]]) host.find(node => node.props?.["aria-label"] === id + ": chest " + number).props.onClick();
  assert.equal(save().props.disabled, false);
  assert.equal(host.calls.length, 0);
  assert.equal(host.privateRequests.length, 0);
  host.setSuccess(false);
  await save().props.onClick();
  assert.equal(host.find(node => node.props?.["aria-label"] === "Axo: chest 2").props["aria-pressed"], true);
  assert.ok(host.find(node => node.props?.role === "alert"));
  host.setSuccess(true);
  await save().props.onClick();
  assert.equal(host.find(node => node.type === "dialog").props.open, false);
  assert.equal(current.minigame.chestReveals.length, 0);
  assert.equal(host.calls.length, 0);
  assert.equal(chest(2).props.reveal, undefined);
  assert.equal(chest(2).props.disabled, false);
  chest(2).props.onReveal();
  assert.deepEqual(host.calls.at(-1).action, { type: "reveal-minority-chest", gameId: 7, chest: 2 });
  host.find(node => node.props?.["aria-label"] === "Axo: chest 1").props.onClick();
  assert.equal(chest(2).props.disabled, true, "unsaved edits cannot reveal the old assignment");
});

test("chest reveals show players sequentially, then the prize; empty and late-viewed chests finish correctly", () => {
  const reveal = { chest: 1, playerIds: ["Axo", "Chow"], prize: "200k", revealedAt: 1000 };
  assert.equal(chestRevealProgress(reveal, 1000), 0);
  const first = 1000 + CHEST_OPENING_DURATION;
  const second = first + CHEST_REVEAL_INTERVAL;
  const prize = second + CHEST_PRIZE_PAUSE;
  assert.equal(chestRevealProgress(reveal, first - 1), 0);
  assert.equal(chestRevealProgress(reveal, first), 1);
  assert.equal(chestRevealProgress(reveal, second - 1), 1);
  assert.equal(chestRevealProgress(reveal, second), 2);
  assert.equal(chestRevealProgress(reveal, prize - 1), 2);
  assert.equal(chestRevealProgress(reveal, prize), 3);
  assert.deepEqual([1, 2, 3].map(step => chestRevealStepTime(reveal, step)), [first, second, prize]);
  assert.equal(chestRevealProgress(reveal, 100000), 3);
  const empty = { ...reveal, playerIds: [] };
  assert.equal(chestRevealProgress(empty, first - 1), 0);
  assert.equal(chestRevealProgress(empty, first), 1);
  assert.equal(chestRevealStepTime(empty, 1), first);
  const solo = { ...reveal, playerIds: ["Axo"] };
  assert.equal(chestRevealStepTime(solo, 2), first + CHEST_PRIZE_PAUSE);
  assert.equal(chestRevealProgress(reveal, 999), 0);
  assert.equal(chestRevealProgress(undefined, 1000), 0);
});

test("Split or Steal appears after a shared save", () => {
  const current = event();
  const host = mount(SplitOrSteal, { current });
  assert.equal(host.render(), null);
  current.splitChallenge = { id: 9, challenger: null, partner: null };
  assert.equal(host.find(node => node.props?.headingId === "split-heading").props.title, "Split or Steal");
  const viewer = mount(SplitOrSteal, { current: event(), canEdit: false });
  assert.equal(viewer.render(), null);
});

test("Split or Steal shares player selection, keeps decisions private, and reveals only on Submit", async () => {
  const current = { ...event(), splitChallenge: { id: 7, challenger: "Axo", partner: null }, splitPartners: [{ challenger: "Axo", partner: "Chow" }] };
  const host = mount(SplitOrSteal, { current });
  const select = label => host.find(node => node.type === "host-select" && node.props.label === label);
  const reveal = () => host.find(node => node.props?.["aria-label"] === "Reveal both decisions");
  const decision = label => host.find(node => node.props?.["aria-label"] === label);
  assert.equal(reveal().props.disabled, true);
  assert.deepEqual(select("Partner").props.options.map(option => option.value), ["Finished Racer"]);
  select("Partner").props.onChange("Finished Racer");
  assert.deepEqual(host.calls[0].action, { type: "set-split-players", challengeId: 7, challenger: "Axo", partner: "Finished Racer" });
  current.splitChallenge.partner = "Finished Racer";
  decision("Landing player: steal").props.onClick();
  assert.equal(reveal().props.disabled, true);
  decision("Partner: split").props.onClick();
  assert.equal(reveal().props.disabled, false);
  assert.equal(host.calls.length, 1);
  assert.equal(current.splitResult, null);
  assert.doesNotMatch(JSON.stringify(current.splitChallenge), /Decision/);
  host.setSuccess(false);
  await reveal().props.onClick();
  assert.equal(decision("Landing player: steal").props["aria-pressed"], true);
  assert.equal(decision("Partner: split").props["aria-pressed"], true);
  assert.match(host.find(node => node.props?.role === "alert").props.children, /decisions are retained/);
  current.revision = 10;
  host.setSuccess(true);
  await reveal().props.onClick();
  assert.deepEqual(host.calls.at(-1), { action: { type: "reveal-split", challengeId: 7, challengerDecision: "steal", partnerDecision: "split" }, revision: 10 });
  const viewer = mount(SplitOrSteal, { current, canEdit: false });
  assert.equal(descendants(viewer.render()).filter(node => node.props?.children?.includes?.("Decision hidden")).length, 2);
  assert.equal(viewer.find(node => node.props?.["data-game-transition"]?.startsWith("split-decision:")), undefined);
  assert.equal(viewer.find(node => node.props?.["data-game-transition"]?.startsWith("split-payout:")), undefined);
  assert.equal(descendants(viewer.render()).filter(node => node.type === "host-select" || node.type === "button").length, 0);
  current.splitResult = { challenger: "Axo", partner: "Finished Racer", challengerDecision: "steal", partnerDecision: "split" };
  assert.ok(viewer.find(node => node.props?.children === "200,000 gil"));
  assert.ok(viewer.find(node => [node.props?.children].flat(Infinity).join("") === "0 gil"));
  assert.equal(descendants(viewer.render()).filter(node => node.props?.["data-game-transition"]?.startsWith("split-decision:")).length, 2);
  assert.equal(descendants(viewer.render()).filter(node => node.props?.["data-game-transition"]?.startsWith("split-payout:")).length, 2);
  assert.equal(viewer.render().props["data-game-transition"], undefined, "result stages are not masked by a parent entrance animation");
  assert.equal(descendants(viewer.render()).filter(node => node.type === "button").length, 0);
});

test("a different shared player pair invalidates the host's pending decisions", () => {
  const current = { ...event(), splitChallenge: { id: 7, challenger: "Axo", partner: "Chow" } };
  const host = mount(SplitOrSteal, { current });
  const decision = label => host.find(node => node.props?.["aria-label"] === label);
  decision("Landing player: steal").props.onClick();
  decision("Partner: steal").props.onClick();
  current.splitChallenge.partner = "Finished Racer";
  assert.equal(host.find(node => node.props?.["aria-label"] === "Reveal both decisions").props.disabled, true);
  assert.notEqual(decision("Landing player: steal").props["aria-pressed"], true);
  assert.equal(host.calls.length, 0);
});



test("trivia shuffles once per command, edits two local amounts and only pays on finalise", async () => {
  const current = { ...event(), minigame: { id: 7, kind: "trivia", teams: [], questionWins: [null, null, null, null, null], triviaWinnings: null, chests: null } };
  const host = mount(TriviaGame, { current });
  const input = team => host.find(node => node.props?.["aria-label"] === `Team ${team} winnings per player (gil)`);
  const submit = () => host.find(node => node.props?.type === "submit");
  assert.equal(submit().props.disabled, true);
  assert.equal(descendants(host.render()).filter(node => node.type === "input").length, 2);
  await host.find(node => node.type === "button" && node.props.type === "button").props.onClick();
  assert.deepEqual(host.calls[0].action, { type: "shuffle-trivia", gameId: 7 });
  current.minigame.teams = players.map((player, index) => ({ id: player.id, team: index < 2 ? "A" : "B" }));
  input("A").props.onChange({ target: { value: "200000" } });
  input("B").props.onChange({ target: { value: "100000" } });
  assert.equal(host.calls.length, 1);
  assert.equal(submit().props.disabled, false);
  host.setSuccess(false);
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(host.calls[1], { action: { type: "finalise-trivia", gameId: 7, winnings: { A: 200_000, B: 100_000 } }, revision: 8 });
  assert.equal(input("A").props.value, "200000");
  assert.equal(input("B").props.value, "100000");
  assert.match(host.find(node => node.props?.role === "alert").props.children, /Review the latest teams/);
  current.revision = 9;
  host.setSuccess(true);
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.at(-1).revision, 9);
  current.minigame.triviaWinnings = { A: 200_000, B: 100_000 };
  assert.equal(input("A").props.disabled, true);
  assert.equal(submit(), undefined);
  const count = host.calls.length;
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.length, count);
});

test("trivia rejects blank, fractional and negative drafts before making a payout request", async () => {
  const current = { ...event(), minigame: { id: 7, kind: "trivia", teams: players.map((player, index) => ({ id: player.id, team: index === 0 ? "A" : "B" })), triviaWinnings: null } };
  const host = mount(TriviaGame, { current });
  for (const value of ["", "-1", "1.5", "9007199254740992"]) {
    host.find(node => node.props?.["aria-label"] === "Team A winnings per player (gil)").props.onChange({ target: { value } });
    assert.equal(host.find(node => node.props?.type === "submit").props.disabled, true);
    await host.render().props.onSubmit({ preventDefault() {} });
  }
  assert.equal(host.calls.length, 0);
});

test("trivia amounts remain editable during another save; changed teams require review before payout", async () => {
  const current = { ...event(), minigame: { id: 7, kind: "trivia", teams: players.map((player, index) => ({ id: player.id, team: index === 0 ? "A" : "B" })), triviaWinnings: null } };
  const props = { current, saving: true };
  const host = mount(TriviaGame, props);
  const input = () => host.find(node => node.props?.["aria-label"] === "Team A winnings per player (gil)");
  const submit = () => host.find(node => node.props?.type === "submit");
  assert.equal(input().props.disabled, false);
  input().props.onChange({ target: { value: "200000" } });
  assert.equal(submit().props.disabled, true);
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.length, 0);
  current.revision = 9;
  props.saving = false;
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(host.calls[0], { action: { type: "finalise-trivia", gameId: 7, winnings: { A: 200000, B: 0 } }, revision: 9 });
  current.minigame.teams = current.minigame.teams.map(row => ({ ...row, team: row.team === "A" ? "B" : "A" }));
  current.revision = 10;
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.length, 1);
  assert.ok(host.find(node => node.props?.role === "alert"));
  await host.render().props.onSubmit({ preventDefault() {} });
  assert.equal(host.calls.at(-1).revision, 10);
});

test("Split or Steal decisions can be entered during unrelated saves; submit waits and uses the current pair", async () => {
  const current = { ...event(), splitChallenge: { id: 7, challenger: "Axo", partner: "Chow" } };
  const props = { current, saving: true };
  const host = mount(SplitOrSteal, props);
  for (const label of ["Landing player: split", "Partner: steal"]) {
    const button = host.find(node => node.props?.["aria-label"] === label);
    assert.equal(button.props.disabled, false);
    button.props.onClick();
  }
  const submit = () => host.find(node => node.props?.["aria-label"] === "Reveal both decisions");
  assert.equal(submit().props.disabled, true);
  await submit().props.onClick();
  assert.equal(host.calls.length, 0);
  current.revision = 9;
  props.saving = false;
  await submit().props.onClick();
  assert.equal(host.calls.at(-1).revision, 9);
});

test("chest assignment drafts stay editable during unrelated saves, while save and reveal wait", () => {
  const current = { ...event(), minigame: { id: 7, kind: "minority", chests: null, chestReveals: [] } };
  const host = mount(MinorityGame, { current, saving: true });
  const assignment = host.find(node => node.props?.["aria-label"] === "Axo: chest 2");
  assert.equal(assignment.props.disabled, false);
  assignment.props.onClick();
  assert.equal(host.find(node => node.props?.["aria-label"] === "Axo: chest 2").props["aria-pressed"], true);
  assert.equal(host.find(node => node.props?.children === "Save assignments").props.disabled, true);
  assert.ok(descendants(host.render()).filter(node => node.type?.name === "MinorityChest").every(node => node.props.disabled));
});

test("spectators see trivia teams and chest cards without host forms or payout actions", async () => {
  const current = { ...event(), minigame: { id: 7, kind: "trivia", teams: players.map((player, index) => ({ id: player.id, team: index === 0 ? "A" : "B" })), triviaWinnings: null } };
  const viewer = mount(TriviaGame, { current, canEdit: false });
  assert.equal(descendants(viewer.render()).filter(node => node.type === "input" || node.type === "button").length, 0);
  assert.ok(viewer.find(node => node.props?.["aria-label"] === "Team A"));
  await viewer.render().props.onSubmit({ preventDefault() {} });
  assert.equal(viewer.calls.length, 0);
  current.minigame = { id: 8, kind: "minority", chests: null, chestReveals: [] };
  const chests = mount(MinorityGame, { current, canEdit: false });
  assert.equal(descendants(chests.render()).filter(node => node.type === "dialog" || node.type === "button").length, 0);
  assert.equal(descendants(chests.render()).filter(node => node.type?.name === "MinorityChest" && !node.props.canReveal && !node.props.reveal).length, 4);
});


test("Minority Draw has three private choices and only hosts can record a deathroll-winning chest", async () => {
  const current = { ...event(), minigame: { id: 12, kind: "minority-draw", teams: [], chests: null, chestReveals: [], minorityDrawWinner: null } };
  const host = mount(MinorityGame, { current });
  const cards = () => descendants(host.render()).filter(node => node.type?.name === "MinorityChest");
  assert.equal(cards().length, 3);
  assert.ok(cards().every(node => node.props.drawStatus === "pending"));
  assert.equal(host.find(node => node.props?.["aria-label"] === "Axo: chest 4"), undefined);
  players.forEach((player, index) => host.find(node => node.props?.["aria-label"] === player.id + ": chest " + (index + 1)).props.onClick());
  await host.find(node => node.props?.children === "Save assignments").props.onClick();
  assert.equal(host.privateRequests.length, 1);
  assert.deepEqual(host.privateState.saved.prizes, []);
  assert.equal(host.calls.length, 0);
  current.minigame.chestReveals = players.map((player, index) => ({ chest: index + 1, playerIds: [player.id], prize: null, revealedAt: 0 }));
  const select = () => host.find(node => node.type === "host-select" && node.props.label === "Deathroll-winning chest");
  const award = () => host.find(node => node.props?.children === "Award winning chest");
  assert.deepEqual(select().props.options.map(option => option.value), ["1", "2", "3"]);
  assert.equal(award().props.disabled, true);
  select().props.onChange("2");
  host.setSuccess(false);
  await award().props.onClick();
  assert.deepEqual(host.calls.at(-1).action, { type: "resolve-minority-draw", gameId: 12, chest: 2 });
  assert.equal(select().props.value, "2", "failed writes retain the host's selected chest for explicit retry");
  assert.ok(cards().every(node => node.props.drawStatus === "tie"));
  host.setSuccess(true);
  await award().props.onClick();
  current.minigame.minorityDrawWinner = 2;
  assert.equal(award(), undefined);
  assert.deepEqual(cards().map(node => node.props.drawStatus), ["no-prize", "winner", "no-prize"]);
  const viewer = mount(MinorityGame, { current: { ...current, minigame: { ...current.minigame, minorityDrawWinner: null } }, canEdit: false });
  assert.ok(viewer.find(node => node.props?.["aria-label"] === "Deathroll tie-break"));
  assert.equal(descendants(viewer.render()).filter(node => node.type === "host-select" || node.type === "button" || node.type === "dialog").length, 0);
});
