import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const originalStorage = globalThis.localStorage;
let saved = null;
globalThis.localStorage = { getItem: () => saved };
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  plugins: [{ name: "gil-rush-page-auth-boundary", enforce: "pre", load(id) {
    if (id.replaceAll("\\", "/").endsWith("/admin/hooks/useAdminAuth.ts")) return "export const useAdminAuth = () => globalThis.gilRushPageAuth;";
    if (id.replaceAll("\\", "/").endsWith("/hooks/useSharedEvent.ts")) return "export const useSharedEvent = () => globalThis.gilRushPageEvent;";
    if (id.replaceAll("\\", "/").endsWith("/hooks/useMembers.ts")) return "export const useMembers = () => { throw new Error('Roster must not load before player setup is opened'); };";
  } }],
});
const { CartelGilRushPage } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/CartelGilRushPage.tsx");
const { TileCard } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/TileCard.tsx");
const { RuleText } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/RuleText.tsx");
const { tiles } = await server.ssrLoadModule("/src/features/cartel-gil-rush/constants.ts");
const { emptyEvent, updateEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/localEvent.ts");

after(async () => {
  await server.close();
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  delete globalThis.gilRushPageAuth;
  delete globalThis.gilRushPageEvent;
});

function render(auth) {
  globalThis.gilRushPageAuth = { checking: false, error: null, login: () => {}, ...auth };
  const event = saved ? JSON.parse(saved) : emptyEvent();
  globalThis.gilRushPageEvent = { current: { ...event, revision: 1, players: event.players.map(player => ({ ...player, gilWon: 0 })) }, error: null, loading: false, pending: false, importable: null, run: async () => true };
  return renderToStaticMarkup(createElement(CartelGilRushPage));
}

test("guest, non-admin and checking sessions cannot render workspace", () => {
  for (const auth of [
    { authed: false, session: null }, { authed: true, session: null },
    { authed: true, session: { isAdmin: false } }, { authed: true, session: { isAdmin: undefined } },
    { authed: true, session: { isAdmin: false, fcRank: "Boss" } },
    { authed: true, session: { isAdmin: false, fcRank: "Underpaw" } },
    { authed: true, checking: true, session: { isAdmin: true } },
  ]) {
    const html = render(auth);
    assert.match(html, /Boss or Underpaw Discord role/);
    assert.doesNotMatch(html, /data-event-view|Add players|DRAFT/);
  }
});

test("live event does not expose either tab or edit controls to non-admin sessions", () => {
  let event = updateEvent(emptyEvent(), { type: "add", player: { id: "guest", name: "Live Player", avatarUrl: null } });
  event = updateEvent(event, { type: "set-mood", mood: "blue" });
  event = updateEvent(event, { type: "start" });
  saved = JSON.stringify(event);
  try {
    for (const fcRank of ["Housecat", "Stray", "Friend", "Boss", "Underpaw"]) {
      const html = render({ authed: true, session: { isAdmin: false, fcRank } });
      assert.match(html, /Boss or Underpaw Discord role/);
      assert.doesNotMatch(html, /data-event-view|Live Player|Edit gil|Change round|Board mood/);
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
    assert.match(html, /50,000 gil/);
    assert.match(html, /Change round, currently round 7/);
    assert.match(html, /aria-label="Board mood"/);
    assert.match(html, /aria-label="Previous round"/);
    assert.match(html, /Next round/);
    assert.match(html, /Edit gil for Long Guest Name, 0 gil accrued/);
    assert.doesNotMatch(html, /View players/);
    assert.match(html, /Quick reference/);
    assert.match(html, /Roll \/random 10. Move the result: even forward, odd back./);
    const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
    assert.doesNotMatch(game, /Randomise order &amp; start|Complete turn|Finish turn|Confirm finish|turns remaining|aria-current/);
  } finally { saved = null; }
});

test("rulebook renders every chapter once with location links and no chapter-switch controls", () => {
  const html = render({ authed: true, session: { isAdmin: true } });
  const ids = ["board-overview", "quick-start", "special-tiles", "board-moods", "rewards"];
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
  assert.equal(html.split('data-board-tile="').length - 1, 90);
  assert.equal(html.split('data-board-symbol="').length - 1, 24);
  assert.equal([...html.matchAll(/aria-label="Tile \d+. Ladder to \d+"/g)].length, 2);
  assert.equal([...html.matchAll(/aria-label="Tile \d+. Fall to \d+"/g)].length, 6);
  assert.match(html, /Tile 13. Fall destination from 74/);
  assert.match(html, /Tile 14. Ladder to 45/);
  const overview = html.slice(html.indexOf('id="rulebook-board-overview"'), html.indexOf('id="rulebook-quick-start"'));
  assert.doesNotMatch(overview, /90 tiles|6 rows|figcaption|Clear selection|All 8 connections shown|Ladder routes|Fall routes|Follow the blue|Only your normal landing tile activates/);
  assert.doesNotMatch(html, /role="tablist"[^>]*aria-label="Rulebook chapters"|rulebook-chapter-label|Next: Tiles|chapter navigation/);
  assert.match(html, /The first three to reach the crown can choose a prize. Game stops after 3 finishers/);
  const quickStart = html.slice(html.indexOf('id="rulebook-quick-start"'), html.indexOf('id="rulebook-special-tiles"'));
  const quickText = quickStart.replace(/<[^>]*>/g, "");
  assert.doesNotMatch(quickText, /Check the active mood before rolling|Blue pays|Under violet|Higher: add both|Only your landing tile activates|Extra tile movement does not chain/);
  assert.match(quickText, /Roll once when called/);
  assert.match(quickText, /Follow the numbered path/);
  assert.ok(quickStart.indexOf('id="quick-finish-heading"') < quickStart.indexOf("Board moods apply from round"));
  assert.doesNotMatch(html, /Violet example:|90 tiles. Up to three finishers.|Ordinary tile:|host-guide|Host guide &amp; finishing/);
  const tileSection = html.slice(html.indexOf('id="rulebook-special-tiles"'), html.indexOf('id="rulebook-board-moods"'));
  const rewardsSection = html.slice(html.indexOf('id="rulebook-rewards"'));
  const moodsSection = html.slice(html.indexOf('id="rulebook-board-moods"'), html.indexOf('id="rulebook-rewards"'));
  assert.deepEqual([...tileSection.matchAll(/<dt\b[^>]*>([^<]+)/g)].map((match) => match[1]), ["Shark", "Moogle", "Mushroom", "Fatcat", "Chocobo", "Ladder", "Red arrow", "Crown / finish"]);
  assert.doesNotMatch(rewardsSection, /Fatcat|Chocobo/);
  assert.doesNotMatch(rewardsSection, /Keep all earned gil/);
  assert.equal(rewardsSection.split('rounded-lg border bg-muted p-4').length - 1, 3);
  assert.match(html, /last:min-h-\[calc\(var\(--rulebook-viewport-height,0px\)-1rem\)\]/);
  assert.doesNotMatch(tileSection, /Only your landing tile activates|Fatcat and Chocobo: one attempt|Passing over tiles|violet second roll is part|standalone tile rolls|A mushroom onto a red arrow|Standing on a special tile/);
  assert.doesNotMatch(moodsSection, />Yellow<|>Blue<|>Violet<|>Red</);
  for (const colour of ["amber", "blue", "violet", "red"]) assert.ok(moodsSection.includes(`bg-${colour}-100`));
  assert.equal(rewardsSection.split('aria-label="Prize option ').length - 1, 3);
  assert.doesNotMatch(html, /Challenges &amp; rewards|Resolve your turn before claiming a place|The host announces the prize options before play|A later normal landing grants another attempt|Gil is paid by the host or recorded separately|Placement rewards are additional to earned gil/);
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
  assert.doesNotMatch(html, /500,000|100,000|partners|Deal a card|Discard/);
});

test("manual mood is displayed independently of round and has no colour label", () => {
  let event = updateEvent(emptyEvent(), { type: "add", player: { id: "a", name: "Axo", avatarUrl: null } });
  event = updateEvent(event, { type: "set-mood", mood: "yellow" });
  event = updateEvent(event, { type: "start" });
  try {
    for (const round of [1, 3, 4, 7, 2]) {
      event = updateEvent(event, { type: "set-round", round });
      saved = JSON.stringify(event);
      const html = render({ authed: true, session: { isAdmin: true } });
      const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
      assert.match(game, /id="active-mood-heading"[^>]*>Lucky Sixes/);
      assert.doesNotMatch(game, /Choose first mood|First mood selected|>Yellow<|>Blue<|>Violet<|>Red<|From round 4/);
      assert.equal(JSON.parse(saved).mood, "yellow");
    }
  } finally { saved = null; }
});

test("Game mood explanation matches Rulebook's main rule without secondary notes", () => {
  try {
    for (const [mood, rule] of [
      ["yellow", "Roll a natural 6 on your normal first roll to earn the announced Lucky Sixes gil reward."],
      ["blue", "Start your turn tied for last among unfinished players to receive 50,000 gil."],
      ["violet", "Keep your first roll, or roll once more. Strictly higher: add both rolls. Equal or lower: move only 1 space."],
      ["red", "Resolve a fall down a red arrow, then receive 200,000 gil."],
    ]) {
      saved = JSON.stringify({ ...emptyEvent(), mood });
      const html = render({ authed: true, session: { isAdmin: true } });
      const game = html.slice(html.indexOf('data-event-view="game"'), html.indexOf('data-event-view="rulebook"'));
      assert.ok(game.includes(rule));
      assert.doesNotMatch(game, /One full rotation|Update round separately|The host handles|The host announces the payout|Standing on a special tile|First-roll 6 earns/);
    }
  } finally { saved = null; }
});
