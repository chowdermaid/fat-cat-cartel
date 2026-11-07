import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

let runner, routeTree;
before(async () => {
  const source = fs.readFileSync("src/app/router.tsx", "utf8");
  const mocks = new Map();
  for (const [, names, module] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"(@\/(?:features\/[^\"]+|components\/layouts\/RootLayout))";/g)) {
    const file = path.resolve("src", module.slice(2));
    const id = (fs.existsSync(`${file}.tsx`) ? `${file}.tsx` : `${file}/index.tsx`).replaceAll("\\", "/");
    mocks.set(id, names.split(",").map(name => name.trim()).filter(Boolean).map(name => `export function ${name}() { return null; }`).join("\n"));
  }
  runner = await createServer({
    configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    plugins: [{ name: "gil-rush-route-boundaries", enforce: "pre", load(id) { return mocks.get(id.replaceAll("\\", "/")); } }],
  });
  ({ routeTree } = (await runner.ssrLoadModule("/src/app/router.tsx")).router);
});
after(async () => runner?.close());

async function load(url) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }), isServer: true });
  await router.load();
  return router;
}

test("base and legacy bookmarks redirect to Game with history replacement", async () => {
  for (const url of ["/cartel-gil-rush", "/cartel-gil-rush/", "/ladders-and-backstabbers"]) {
    let router = await load(url);
    if (url.endsWith("/")) router = await load(router.state.redirect.options.href);
    assert.equal(router.state.redirect.options.to, "/cartel-gil-rush/game");
    assert.equal(router.state.redirect.options.replace, true);
  }
});

test("Game and Rulebook resolve publicly under the same workspace route", async () => {
  for (const view of ["game", "rulebook"]) {
    const router = await load(`/cartel-gil-rush/${view}`);
    assert.equal(router.state.redirect, undefined);
    assert.equal(router.state.statusCode, 200);
    assert.equal(router.state.matches[1].routeId, "/cartel-gil-rush");
    assert.equal(router.state.matches.at(-1).routeId, `/cartel-gil-rush/${view}`);
    assert.equal(router.state.matches.at(-1).status, "success");
  }
  assert.equal((await load("/cartel-gil-rush/unknown")).state.statusCode, 404);
});

test("view navigation adds history entries and Back/Forward retains the parent match", async () => {
  const router = await load("/cartel-gil-rush/game");
  const parentId = router.state.matches[1].id;
  await router.navigate({ to: "/cartel-gil-rush/rulebook", resetScroll: false });
  assert.equal(router.state.location.pathname, "/cartel-gil-rush/rulebook");
  assert.equal(router.state.matches[1].id, parentId);
  assert.equal(router.resetNextScroll, false);
  router.history.back();
  await router.load();
  assert.equal(router.state.location.pathname, "/cartel-gil-rush/game");
  assert.equal(router.state.matches[1].id, parentId);
  router.history.forward();
  await router.load();
  assert.equal(router.state.location.pathname, "/cartel-gil-rush/rulebook");
  assert.equal(router.state.matches[1].id, parentId);
});
