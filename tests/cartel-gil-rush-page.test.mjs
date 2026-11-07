import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { createServer } from "vite";

const originalStorage = globalThis.localStorage;
const previewAuth = { authed: true, session: { isAdmin: false, isMember: true, lodestoneId: "51550870" } };
let saved = null;
let bingoSaved = null;
globalThis.localStorage = { getItem: key => key === "fcc_cartel_gil_rush_bingo_v1" ? bingoSaved : saved };
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  plugins: [{ name: "gil-rush-page-auth-boundary", enforce: "pre", load(id) {
    if (id.replaceAll("\\", "/").endsWith("/admin/hooks/useAdminAuth.ts")) return "export const useAdminAuth = () => globalThis.gilRushPageAuth;";
    if (id.replaceAll("\\", "/").endsWith("/hooks/useMinorityAssignments.ts")) return "export const useMinorityAssignments = () => ({ saved: null, loading: false, pending: false, error: null });";
    if (id.replaceAll("\\", "/").endsWith("/hooks/useSharedEvent.ts")) return "export const useSharedEvent = (...args) => { globalThis.gilRushSharedArgs = args; return globalThis.gilRushPageEvent; };";
    if (id.replaceAll("\\", "/").endsWith("/hooks/useMembers.ts")) return "export const useMembers = () => { throw new Error('Roster must not load before player setup is opened'); };";
  } }],
});
const { CartelGilRushPage } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/CartelGilRushPage.tsx");
const { TileCard } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/TileCard.tsx");
const { RuleText } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/RuleText.tsx");
const { tiles } = await server.ssrLoadModule("/src/features/cartel-gil-rush/constants.ts");
const { readGilRushEvent } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-model.ts");
const { emptyEvent, updateEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/localEvent.ts");
const pageRouters = {};
for (const view of ["game", "rulebook"]) {
  const root = createRootRoute();
  const route = createRoute({ getParentRoute: () => root, path: `/cartel-gil-rush/${view}` });
  pageRouters[view] = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [`/cartel-gil-rush/${view}`] }), isServer: true });
  await pageRouters[view].load();
}

after(async () => {
  await server.close();
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  delete globalThis.gilRushPageAuth;
  delete globalThis.gilRushPageEvent;
  delete globalThis.gilRushSharedArgs;
});

function render(auth, eventOverrides = {}, view = "game") {
  delete globalThis.gilRushSharedArgs;
  globalThis.gilRushPageAuth = { checking: false, error: null, sessionToken: "test-token", login: () => {}, ...auth };
  const event = saved ? JSON.parse(saved) : emptyEvent();
  globalThis.gilRushPageEvent = { current: readGilRushEvent({ ...event, revision: 1, players: event.players.map(player => ({ ...player, gilWon: player.gilWon ?? 0 })) }), error: null, readError: null, loading: false, pending: false, pendingKeys: [], importable: null, run: async () => true, ...eventOverrides };
  return renderToStaticMarkup(createElement(RouterContextProvider, { router: pageRouters[view] }, createElement(CartelGilRushPage)));
}

test("allowed direct URLs select the corresponding tab and retain both mounted panels", () => {
  for (const view of ["game", "rulebook"]) {
    const html = render(previewAuth, {}, view);
    const other = view === "game" ? "rulebook" : "game";
    assert.match(html, new RegExp(`data-state="active"[^>]*data-event-view="${view}"`));
    assert.match(html, new RegExp(`data-state="inactive"[^>]*data-event-view="${other}"`));
    assert.equal(html.includes("Back to game"), view === "rulebook");
  }
});

test("guests, other members and checking sessions cannot mount either view or subscribe", () => {
  for (const auth of [
    { authed: false, session: null }, { authed: true, session: null },
    { authed: true, session: { isAdmin: false } }, { authed: true, session: { isAdmin: undefined } },
    { authed: true, session: { isAdmin: false, fcRank: "Boss" } },
    { authed: true, session: { isAdmin: false, fcRank: "Underpaw" } },
    { authed: true, checking: true, session: { isAdmin: true } },
    { ...previewAuth, session: { ...previewAuth.session, isMember: false } },
    { ...previewAuth, session: { ...previewAuth.session, lodestoneId: "51550871" } },
    { ...previewAuth, sessionToken: null },
  ]) {
    for (const view of ["game", "rulebook"]) {
      const html = render(auth, {}, view);
      assert.doesNotMatch(html, /data-event-view|data-bingo-mission|Live view|Board Overview/);
      assert.match(html, /internal|Checking access/);
      assert.equal(globalThis.gilRushSharedArgs, undefined);
    }
  }
});

test("the preview member reads with their session token and loses access on a read failure", () => {
  render(previewAuth);
  assert.deepEqual(globalThis.gilRushSharedArgs, ["test-token", false]);
  for (const state of [{ loading: true }, { readError: "Permission denied" }]) {
    const html = render(previewAuth, state, "rulebook");
    assert.doesNotMatch(html, /data-event-view|data-bingo-mission|Board Overview/);
  }
});

test("the invited player sees active trivia teams without editing or payout controls", () => {
  saved = JSON.stringify({ version: 1, phase: "live", round: 7, players: [{ id: "guest", name: "Live Player", avatarUrl: null }, { id: "other", name: "Other Player", avatarUrl: null }], minigame: { id: 42, kind: "trivia", teams: [{ id: "guest", team: "A" }, { id: "other", team: "B" }] } });
  try {
    for (const fcRank of ["Housecat", "Stray", "Friend", "Boss", "Underpaw"]) {
      const html = render({ ...previewAuth, session: { ...previewAuth.session, fcRank } });
      assert.match(html, /Live Player/);
      assert.match(html, /Other Player/);
      assert.match(html, /aria-label="Team A"/);
      assert.match(html, /aria-label="Team B"/);
      assert.equal((html.match(/data-round-display="7"/g) ?? []).length, 2);
      assert.doesNotMatch(html.slice(0, html.indexOf('data-event-view="rulebook"')), /Edit gil|Change round|Shuffle into two teams|winnings per player|Finalise game|End minigame|Play Split or Steal|Open Split or Steal from Chocobo|Assign golden die|Record private/);
      assert.doesNotMatch(html, /<input/);
    }
  } finally { saved = null; }
});

test("Boss and Underpaw retain both views and solo setup controls", () => {
  for (const fcRank of ["Boss", "Underpaw"]) {
    const html = render({ authed: true, session: { isAdmin: true, fcRank } });
    assert.match(html, /Cartel Gil Rush/);
    assert.match(html, /data-event-view="game"/);
    assert.match(html, /data-event-view="rulebook"/);
    assert.match(html, /Add players/);
    assert.match(html, /Randomise order &amp; start/);
    assert.doesNotMatch(html, /Deal a card|Undo last action|Confirm crews|Complete turn|Confirm finish/);
  }
});

test("live view shows fixed display-only order and independent host controls", () => {
  let event = updateEvent(emptyEvent(), { type: "add", player: { id: "guest", name: "Long Guest Name", avatarUrl: null } });
  event = updateEvent(event, { type: "set-mood", mood: "blue" });
  event = updateEvent(event, { type: "start" });
  event = updateEvent(event, { type: "set-round", round: 7 });
  saved = JSON.stringify(event);
  try {
    const html = render({ authed: true, session: { isAdmin: true } });
    assert.match(html, /Fixed player turn order/);
    assert.match(html, /Long Guest Name/);
    assert.match(html, /Group minigames/);
    assert.match(html, /Change round, currently round 7/);
    assert.doesNotMatch(html, /aria-label="Board mood"/);
    assert.match(html, /aria-label="Open Split or Steal from Chocobo tile 23"/);
    assert.doesNotMatch(html, /Assign golden die|Remove golden die/);
    assert.match(html, /aria-label="Previous round"/);
    assert.match(html, /Next round/);
    assert.match(html, /Edit gil for Long Guest Name, 0 gil accrued/);
    assert.doesNotMatch(html, /View players/);
    const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
    assert.match(game, /aria-labelledby="game-board-overview-heading"/);
    assert.equal((game.match(/data-round-display="7"/g) ?? []).length, 2);
    assert.match(game, />Guide<\/h2>/);
    assert.doesNotMatch(game, /Board Overview|Layout and original idea|Thornhart/);
    assert.equal(game.split('data-board-tile="').length - 1, 90);
    assert.doesNotMatch(game, /Quick reference/);
    assert.doesNotMatch(game, /Randomise order &amp; start|Complete turn|Finish turn|Confirm finish|turns remaining|aria-current/);
  } finally { saved = null; }
});

test("a pending player save leaves other players, rounds and trivia drafts editable while payout commands wait", () => {
  saved = JSON.stringify({ version: 1, phase: "live", round: 7, players: [{ id: "a", name: "Axo", avatarUrl: null }, { id: "b", name: "Chow", avatarUrl: null }], minigame: { id: 7, kind: "trivia", teams: [{ id: "a", team: "A" }, { id: "b", team: "B" }] } });
  try {
    const html = render({ authed: true, session: { isAdmin: true } }, { pending: true, pendingKeys: ["player:a"] });
    const button = label => html.match(new RegExp('<button[^>]*aria-label="' + label + '"[^>]*>'))?.[0];
    assert.match(button("Edit gil for Axo, 0 gil accrued"), / disabled=/);
    assert.doesNotMatch(button("Edit gil for Chow, 0 gil accrued"), / disabled=/);
    assert.doesNotMatch(button("Next round"), / disabled=/);
    const input = html.match(/<input[^>]*aria-label="Team A winnings per player \(gil\)"[^>]*>/)?.[0];
    assert.ok(input);
    assert.doesNotMatch(input, / disabled=/);
    assert.match(html, /Saving 1 change/);
    assert.match(html, /<button[^>]* disabled=""[^>]*>Finalise game &amp; add gil<\/button>/);
    assert.match(html, /<button[^>]* disabled=""[^>]*>End minigame<\/button>/);
  } finally { saved = null; }
});

test("rulebook renders every chapter once with location links and no chapter-switch controls", () => {
  const html = render({ authed: true, session: { isAdmin: true } });
  const rulebook = html.slice(html.indexOf('data-event-view="rulebook"'));
  const ids = ["board-overview", "quick-start", "special-tiles", "group-minigames", "bingo", "rewards"];
  let previous = -1;
  for (const id of ids) {
    assert.equal(html.split(`id="rulebook-${id}"`).length - 1, 1);
    assert.ok(html.includes(`href="#rulebook-${id}"`));
    const position = html.indexOf(`data-rulebook-chapter="${id}"`);
    assert.ok(position > previous);
    previous = position;
  }
  assert.equal(html.split('aria-current="location"').length - 1, 1);
  assert.match(html, /href="#rulebook-board-overview" aria-current="location"/);
  assert.equal(rulebook.split('data-board-tile="').length - 1, 90);
  assert.equal(rulebook.split('data-board-symbol="').length - 1, 25);
  assert.equal([...rulebook.matchAll(/aria-label="Tile \d+. Ladder to \d+[^"]*"/g)].length, 2);
  assert.equal([...rulebook.matchAll(/aria-label="Tile \d+. Fall to \d+"/g)].length, 6);
  assert.match(html, /Tile 13. Ladder to 45/);
  assert.match(html, /Tile 78. Moogle/);
  const overview = html.slice(html.indexOf('id="rulebook-board-overview"'), html.indexOf('id="rulebook-quick-start"'));
  assert.match(overview, /Board Overview/);
  assert.match(overview, /Layout and original idea by/);
  assert.doesNotMatch(overview, /90 tiles|6 rows|figcaption|Clear selection|All 8 connections shown|Ladder routes|Fall routes|Follow the blue|Only your normal landing tile activates/);
  assert.doesNotMatch(html, /role="tablist"[^>]*aria-label="Rulebook chapters"|rulebook-chapter-label|Next: Tiles|chapter navigation/);
  assert.match(html, /Finished racers stop taking board turns but remain eligible for group minigames and gil prizes/);
  const quickStart = html.slice(html.indexOf('id="rulebook-quick-start"'), html.indexOf('id="rulebook-special-tiles"'));
  const quickText = quickStart.replace(/<[^>]*>/g, "");
  assert.doesNotMatch(quickText, /Check the active mood before rolling|Blue pays|Under violet|Higher: add both|Only your landing tile activates|Extra tile movement does not chain/);
  assert.match(quickText, /Roll once when called/);
  assert.match(quickText, /Follow the numbered path/);
  assert.doesNotMatch(quickStart, /Group minigames after every six|Proposed schedule, started manually/);
  assert.doesNotMatch(html, /Violet example:|90 tiles. Up to three finishers.|Ordinary tile:|host-guide|Host guide &amp; finishing/);
  const tileSection = html.slice(html.indexOf('id="rulebook-special-tiles"'), html.indexOf('id="rulebook-group-minigames"'));
  const rewardsSection = html.slice(html.indexOf('id="rulebook-rewards"'));
  const moodsSection = html.slice(html.indexOf('id="rulebook-group-minigames"'), html.indexOf('id="rulebook-rewards"'));
  assert.deepEqual([...tileSection.matchAll(/<dt\b[^>]*>([^<]+)/g)].map((match) => match[1]), ["Shark", "Moogle", "Mushroom", "Fatcat", "Chocobo", "Ladder", "Red arrow", "Crown / finish"]);
  assert.doesNotMatch(rewardsSection, /Fatcat|Chocobo/);
  assert.doesNotMatch(rewardsSection, /Keep all earned gil/);
  assert.equal(rewardsSection.split('rounded-lg border bg-muted p-4').length - 1, 3);
  assert.match(html, /last:min-h-\[calc\(var\(--rulebook-viewport-height,0px\)-1rem\)\]/);
  assert.doesNotMatch(tileSection, /Only the destination of normal movement activates a tile|Extra tile movement does not activate another tile|Movement stops at the start or crown/);
  assert.doesNotMatch(moodsSection, />Yellow<|>Blue<|>Violet<|>Red</);
  assert.match(moodsSection, /Group Trivia/);
  assert.match(moodsSection, /Treasure Draw/);
  assert.match(moodsSection, /Minority Draw/);
  assert.doesNotMatch(moodsSection, /Everyone plays, including finished racers|Every six full rounds|Bonus movement dice|One golden bonus die per player/);
  assert.doesNotMatch(html, /Board moods|Lucky Sixes|Workers&#x27; Compensation/);
  assert.equal(rewardsSection.split('aria-label="Prize option ').length - 1, 3);
  assert.doesNotMatch(html, /Challenges &amp; rewards|Resolve your turn before claiming a place|The host announces the prize options before play|Gil is paid by the host or recorded separately|Placement rewards are additional to earned gil/);
});

test("Bingo stays playable in Game and has its own explanatory Rulebook chapter without a tab", () => {
  const card = { version: 1, eventId: "cartel-gil-rush-1", missionIds: [1, 2, 3, 5, 6, 7, 8, 9, 10], completedIds: [1, 5] };
  bingoSaved = JSON.stringify(card);
  try {
    for (const auth of [previewAuth, { authed: true, session: { isAdmin: true } }]) {
      const html = render(auth);
      assert.equal((html.match(/role="tab"/g) ?? []).length, 2);
      assert.doesNotMatch(html, /data-event-view="bingo"/);
      const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
      assert.match(game, /2 of 9 complete/);
      assert.deepEqual([...game.matchAll(/data-bingo-mission="(\d+)"/g)].map(match => Number(match[1])), card.missionIds);
      assert.equal((game.match(/aria-pressed="true"/g) ?? []).length, 2);
      const rulebook = html.slice(html.indexOf('data-event-view="rulebook"'));
      assert.doesNotMatch(rulebook, /data-bingo-mission|aria-label="Bingo card"|aria-label="Bingo missions"|of 9 complete/);
      const minigames = rulebook.slice(rulebook.indexOf('id="rulebook-group-minigames"'), rulebook.indexOf('id="rulebook-bingo"'));
      assert.doesNotMatch(minigames, /Nine random missions|bingo-heading|bingo.png/);
      const bingo = rulebook.slice(rulebook.indexOf('id="rulebook-bingo"'), rulebook.indexOf('id="rulebook-rewards"'));
      assert.match(bingo, /aria-labelledby="bingo-heading"/);
      assert.match(bingo, /bingo.png/);
      assert.match(bingo, /Nine random missions/);
      assert.match(bingo, /screenshot to Chow/);
      assert.ok(bingo.includes("3+ missions: 250k gil"));
      assert.ok(bingo.includes("6+ missions: 500k gil"));
      assert.match(bingo, /All 9: 1m gil/);
      assert.match(bingo, /Highest tier only/);
      assert.doesNotMatch(html, /Roll a 10 using a golden die/);
    }
  } finally { bingoSaved = null; }
});

test("rule references pair rolls, movement and gil with the appropriate inline icons", () => {
  const html = renderToStaticMarkup(createElement(RuleText, { text: "Roll /random 6. Roll /random 10. Move forward 4. Move backwards 2. Win 200,000 gil." }));
  for (const name of ["dice-?6", "dices", "arrow-right", "arrow-left", "coins"]) assert.match(html, new RegExp(`lucide-${name}`));
  assert.match(html, /200,000 gil/);
  assert.match(html, /aria-hidden="true"/);
});

test("all seven tile cards retain cream styling with corrected solo effects", () => {
  const html = tiles.map((tile) => renderToStaticMarkup(createElement(TileCard, { tile }))).join("");
  assert.equal(tiles.length, 7);
  for (const name of ["Shark", "Fatcat", "Chocobo", "Moogle", "Mushroom", "Ladder", "Red arrow"]) assert.ok(html.includes(`aria-label="${name} tile"`));
  assert.match(html, /bg-\[#f6efdf\]/);
  assert.match(html, /min-h-\[420px\]/);
  assert.match(html, /200,000 gil/);
  assert.match(html, /Strictly|no payout/);
  assert.match(html, /Immediately move forward/);
  assert.match(html, /Standalone tile roll: \/random 10/);
  assert.match(html, /Even: move forward by the result. Odd: move backwards by the result./);
  assert.doesNotMatch(html, /Move backwards 3 spaces/);
  assert.match(html, /100,000 gil each/);
  assert.doesNotMatch(html, /Lucky Sixes|violet attempt|Axo&#x27;s Trivia|Deal a card|Discard/);
});

test("legacy moods never appear; live rewards and minigames render from the shared model", () => {
  saved = JSON.stringify({ version: 1, phase: "live", round: 7, mood: "yellow", players: [{ id: "a", name: "Axo", avatarUrl: null, gilWon: 100000, bonusDie: 10 }, { id: "b", name: "Chow", avatarUrl: null, gilWon: 0 }], minigame: { id: 3, kind: "trivia", teams: [{ id: "a", team: "A" }, { id: "b", team: "B" }], questionWins: ["A", null, null] } });
  try {
    const html = render({ authed: true, session: { isAdmin: true } });
    assert.match(html, /Can use \/random 10 for normal movement until the next minigame/);
    assert.match(html, /golden-dice\.png/);
    assert.match(html, /100,000 gil/);
    assert.match(html, /aria-label="Team A"/);
    assert.match(html, /aria-label="Team B"/);
    assert.doesNotMatch(html, /Finalised. Winnings added/);
    assert.match(html, /Team A winnings per player \(gil\)/);
    assert.doesNotMatch(html, /Question 1:|Awaiting result|Move to A|Assign team/);
    assert.doesNotMatch(html, /Board mood|Lucky Sixes/);
  } finally { saved = null; }
});

test("active banners keep End minigame host-only and omit lower panels for externally played games", () => {
  try {
    for (const kind of ["trivia", "minority", "minority-draw", "eorzeaguessr", "marbles", "deathroll"]) {
      saved = JSON.stringify({ version: 1, phase: "live", round: 7, players: [{ id: "a", name: "Axo", avatarUrl: null }], minigame: { id: 4, kind } });
      for (const isAdmin of [true, false]) {
        const html = render(isAdmin ? { authed: true, session: { isAdmin: true } } : previewAuth);
        const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
        const banner = game.slice(game.indexOf('aria-label="Active group minigame"'), game.indexOf("</header>"));
        assert.match(banner, /Minigame event/);
        assert.equal((game.match(/End minigame/g) ?? []).length, isAdmin ? 1 : 0);
        if (isAdmin) assert.match(banner, /End minigame/);
        if (["eorzeaguessr", "marbles", "deathroll"].includes(kind)) {
          assert.doesNotMatch(game, /id="minigame-heading"|Record gil|Suggested rule|Confirm starting value/);
        }
        if (kind === "marbles") assert.match(banner, /<strong>Chow will stream Marble Rush\.<\/strong>/);
      }
    }
  } finally { saved = null; }
});

test("Treasure Draw shows saved players before prize reveals without selection counts", () => {
  const event = { version: 1, phase: "live", round: 7, players: [{ id: "a", name: "Axo", avatarUrl: null }, { id: "b", name: "Chow", avatarUrl: null }], minigame: { id: 4, kind: "minority" } };
  try {
    saved = JSON.stringify(event);
    const hidden = render({ authed: true, session: { isAdmin: true } });
    assert.equal((hidden.match(/No players assigned/g) ?? []).length, 4);
    assert.doesNotMatch(hidden, /selections<|Chest [1-4] wins/);
    const choices = [{ id: "a", chest: 2 }, { id: "b", chest: 4 }];
    const assigned = { ...event, minigame: { ...event.minigame, treasureAssignments: { revision: 1, choices }, chestReveals: [] } };
    saved = JSON.stringify(assigned);
    for (const isAdmin of [true, false]) {
      const html = render(isAdmin ? { authed: true, session: { isAdmin: true } } : previewAuth);
      const chest2 = html.slice(html.indexOf('aria-label="Chest 2"'), html.indexOf('aria-label="Chest 3"'));
      const chest4 = html.slice(html.indexOf('aria-label="Chest 4"'), html.indexOf('data-event-view="rulebook"'));
      assert.match(chest2, /Axo/);
      assert.doesNotMatch(chest2, /Chow|Choices hidden|100,000 gil|golden-dice/);
      assert.match(chest4, /Chow/);
      assert.equal(chest2.includes("Reveal chest 2"), isAdmin);
    }
    assigned.minigame.chestReveals = [{ chest: 2, playerIds: ["a"], prize: "100k", revealedAt: Date.now() }];
    saved = JSON.stringify(assigned);
    const opening = render(previewAuth);
    const openingChest = opening.slice(opening.indexOf('aria-label="Chest 2"'), opening.indexOf('aria-label="Chest 3"'));
    assert.match(openingChest, /Axo/);
    assert.doesNotMatch(openingChest, /100,000 gil|Revealing players/);
    assigned.minigame.chestReveals[0].revealedAt = 0;
    saved = JSON.stringify(assigned);
    const complete = render(previewAuth);
    assert.match(complete.slice(complete.indexOf('aria-label="Chest 2"'), complete.indexOf('aria-label="Chest 3"')), /100,000 gil/);
    saved = JSON.stringify({ ...event, minigame: { ...event.minigame, chests: [{ id: "a", chest: 3 }, { id: "b", chest: 3 }] } });
    const revealed = render({ authed: true, session: { isAdmin: true } });
    assert.doesNotMatch(revealed, /\d+ selections/);
    assert.match(revealed, /Prize not recorded/);
    assert.doesNotMatch(revealed, /Choices hidden/);
  } finally { saved = null; }
});

test("Split or Steal opens for everyone, hides decisions until reveal and keeps all controls host-only", () => {
  const base = { version: 1, phase: "live", round: 1, players: [{ id: "a", name: "Astrid Gertrud", avatarUrl: null, gilWon: 0 }, { id: "b", name: "Blue Belladonna", avatarUrl: null, gilWon: 0 }], splitChallenge: { id: 9, challenger: "a", partner: "b" } };
  try {
    saved = JSON.stringify(base);
    const html = render(previewAuth);
    const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
    assert.doesNotMatch(game, /200,000 gil pot/);
    assert.equal((game.match(/Decision hidden/g) ?? []).length, 2);
    assert.match(game, /Astrid Gertrud/);
    assert.match(game, /Blue Belladonna/);
    assert.doesNotMatch(game, /Submit &amp; reveal|Clear result|Cancel challenge|Private decision|Landing player: split|Partner: steal|role="combobox"|<input/);
    const host = render({ authed: true, session: { isAdmin: true } });
    assert.match(host, /Submit &amp; reveal/);
    assert.match(host, /aria-label="Landing player: split"/);
    assert.match(host, /aria-label="Partner: steal"/);
    saved = JSON.stringify({ ...base, players: base.players.map(player => ({ ...player, gilWon: player.id === "b" ? 200000 : 0 })), splitResult: { challenger: "a", partner: "b", challengerDecision: "split", partnerDecision: "steal" } });
    const revealed = render(previewAuth);
    const split = revealed.slice(revealed.indexOf('id="split-heading"'), revealed.indexOf('data-event-view="rulebook"'));
    assert.match(split, /0 gil/);
    assert.match(split, /200,000 gil/);
    assert.doesNotMatch(split, /Decision hidden|Clear result|Submit &amp; reveal/);
    assert.match(render({ authed: true, session: { isAdmin: true } }), /Clear result/);
  } finally { saved = null; }
});


test("Minority Draw shares three hidden chests and its tie-break status, with host-only settlement", () => {
  const players = ["a", "b", "c"].map(id => ({ id, name: "Player " + id, avatarUrl: null, gilWon: 0 }));
  const event = { version: 1, phase: "live", round: 7, players, minigame: { id: 18, kind: "minority-draw", chestReveals: [], minorityDrawWinner: null } };
  const gameOnly = html => html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
  try {
    saved = JSON.stringify(event);
    const hidden = gameOnly(render(previewAuth));
    assert.match(hidden, /Minority Draw/);
    assert.equal((hidden.match(/Choices hidden/g) ?? []).length, 3);
    assert.doesNotMatch(hidden, /Chest 4|Record chest assignments|Award winning chest|Deathroll-winning chest/);
    event.minigame.chestReveals = players.map((player, index) => ({ chest: index + 1, playerIds: [player.id], prize: null, revealedAt: 0 }));
    saved = JSON.stringify(event);
    const viewer = gameOnly(render(previewAuth));
    assert.match(viewer, /Chow hosts the deathroll/);
    assert.equal((viewer.match(/Deathroll tie-break/g) ?? []).length, 4);
    assert.doesNotMatch(viewer, /Prize not recorded|Award winning chest|Deathroll-winning chest|role="combobox"/);
    const host = gameOnly(render({ authed: true, session: { isAdmin: true } }));
    assert.match(host, /Award winning chest/);
    assert.match(host, /aria-label="Deathroll-winning chest"/);
    saved = JSON.stringify({ ...event, minigame: { ...event.minigame, minorityDrawWinner: 2 } });
    const result = gameOnly(render(previewAuth));
    assert.match(result, /200,000 gil \+ golden die/);
    assert.equal((result.match(/No prize/g) ?? []).length, 2);
    assert.doesNotMatch(result, /Award winning chest|Deathroll-winning chest|Deathroll tie-break/);
  } finally { saved = null; }
});
