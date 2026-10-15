import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

let runner, routeTree;
before(async () => {
  const routerSource = fs.readFileSync("src/app/router.tsx", "utf8");
  const mocks = new Map();
  for (const [, names, source] of routerSource.matchAll(/import\s*\{([^}]+)\}\s*from\s*"(@\/(?:features\/[^"]+|components\/layouts\/RootLayout))";/g)) {
    const file = path.resolve("src", source.slice(2));
    const id = (fs.existsSync(`${file}.tsx`) ? `${file}.tsx` : `${file}/index.tsx`).replaceAll("\\", "/");
    mocks.set(id, names.split(",").map((name) => name.trim()).filter(Boolean).map((name) => `export function ${name}() { return null; }`).join("\n"));
  }
  runner = await createServer({
    configFile: false,
    envFile: false,
    logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    oxc: { jsx: { runtime: "automatic" } },
    plugins: [{ name: "routing-only-components", enforce: "pre", load(id) { return mocks.get(id.replaceAll("\\", "/")); } }],
  });
  ({ routeTree } = (await runner.ssrLoadModule("/src/app/router.tsx")).router);
});
after(async () => runner?.close());

async function load(url) {
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [url] }), isServer: true });
  await router.load();
  return router;
}

test("FC Collection root redirects to overview with history replacement", async () => {
  for (const url of ["/fc-collection", "/fc-collection/"]) {
    let router = await load(url);
    if (url.endsWith("/")) {
      assert.equal(router.state.redirect.options.href, "/fc-collection");
      router = await load(router.state.redirect.options.href);
    }
    assert.equal(router.state.redirect.options.to, "/fc-collection/overview");
    assert.equal(router.state.redirect.options.replace, true);
  }
});

test("overview, collections, and rankings resolve under the same parent layout", async () => {
  for (const url of ["/fc-collection/overview", "/fc-collection/collections", "/fc-collection/collections/minions", "/fc-collection/rankings"]) {
    const router = await load(url);
    assert.equal(router.state.redirect, undefined);
    assert.equal(router.state.statusCode, 200);
    assert.equal(router.state.matches[1].routeId, "/fc-collection");
    assert.equal(router.state.matches.at(-1).status, "success");
  }
});

test("legacy category and leaderboard bookmarks redirect to canonical views", async () => {
  for (const type of ["mounts", "minions", "titles", "achievements"]) {
    const router = await load(`/fc-collection/${type}`);
    assert.equal(router.state.redirect.options.to, "/fc-collection/collections/$type");
    assert.equal(router.state.redirect.options.params.type, type);
    assert.equal(router.state.redirect.options.replace, true);
  }
  const router = await load("/fc-collection/leaderboard");
  assert.equal(router.state.redirect.options.to, "/fc-collection/rankings");
  assert.equal(router.state.redirect.options.replace, true);
});
