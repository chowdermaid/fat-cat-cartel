import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Render the real page offline. Auth is the only replaced feature boundary;
// no OAuth, Firebase or browser storage is contacted.
const originalStorage = globalThis.localStorage;
globalThis.localStorage = { getItem: () => null };
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  plugins: [{ name: "ladders-page-auth-boundary", enforce: "pre", load(id) {
    if (id.replaceAll("\\", "/").endsWith("/admin/hooks/useAdminAuth.ts")) {
      return "export const useAdminAuth = () => globalThis.laddersPageAuth;";
    }
  } }],
});
const { LaddersAndBackstabbersPage } = await server.ssrLoadModule("/src/features/ladders-and-backstabbers/components/LaddersAndBackstabbersPage.tsx");
after(async () => {
  await server.close();
  if (originalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalStorage;
  delete globalThis.laddersPageAuth;
});

function render(auth) {
  globalThis.laddersPageAuth = { checking: false, error: null, login: () => {}, ...auth };
  return renderToStaticMarkup(createElement(LaddersAndBackstabbersPage));
}

test("guest, non-admin and checking sessions cannot render event views or host controls", () => {
  for (const auth of [
    { authed: false, session: null },
    { authed: true, session: null },
    { authed: true, session: { isAdmin: false } },
    { authed: true, session: { isAdmin: undefined } },
    { authed: true, checking: true, session: { isAdmin: true } },
  ]) {
    const html = render(auth);
    assert.match(html, /Boss or Underpaw Discord role/);
    assert.doesNotMatch(html, /data-event-view|Add attendees|DRAFT/);
  }
});

test("verified Boss and Underpaw sessions see DRAFT and both event views without old notes", () => {
  for (const fcRank of ["Boss", "Underpaw"]) {
    const html = render({ authed: true, session: { isAdmin: true, fcRank } });
    assert.match(html, />DRAFT</);
    assert.match(html, /data-event-view="game"/);
    assert.match(html, /data-event-view="rulebook"/);
    assert.match(html, /Add attendees/);
    assert.doesNotMatch(html, />Live<|Saved on this browser|Card effects, movement and missions stay manual/);
  }
});
