import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { rankMembers } from "../src/features/keybound-brawler/utils/scores.ts";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  ssr: { noExternal: ["react", "sonner"], external: ["react/jsx-runtime", "react/jsx-dev-runtime"] },
  plugins: [{ name: "keybound-editor-harness", enforce: "pre",
    resolveId(id) { if (id === "react" || id === "sonner") return `\0keybound-${id}`; },
    load(id) {
      if (id === "\0keybound-react") return `
        export const useState = initial => globalThis.keyboundHarness.useState(initial);
        export const useRef = value => globalThis.keyboundHarness.useRef(value);
        export const useEffect = callback => globalThis.keyboundHarness.useEffect(callback);
      `;
      if (id === "\0keybound-sonner") return "export const toast = { success: () => {} };";
      const file = id.replaceAll("\\", "/");
      if (file.endsWith("/api/keyboundScores.ts")) return "export const saveKeyboundScores = (...args) => globalThis.keyboundSave(...args);";
      if (file.endsWith("/components/ui/button.tsx")) return 'export const Button = "button";';
      if (file.endsWith("/components/ui/input.tsx")) return 'export const Input = "input";';
      if (file.endsWith("/components/ui/popover.tsx")) return 'export const Popover = "popover"; export const PopoverContent = "content"; export const PopoverTrigger = "trigger";';
    },
  }, react()],
});
const { useScoreEditor } = await server.ssrLoadModule("/src/features/keybound-brawler/hooks/useScoreEditor.ts");
const { ScorePopover } = await server.ssrLoadModule("/src/features/keybound-brawler/components/ScorePopover.tsx");
after(async () => { await server.close(); delete globalThis.keyboundHarness; delete globalThis.keyboundSave; });

const rows = rankMembers({ "1": { name: "Alpha" }, "2": { name: "Bravo" } }, { "1": 10, "2": 5 });
function harness(renderComponent) {
  const slots = [];
  let cursor = 0, cleanup, effectMounted = false, writes = 0;
  globalThis.keyboundHarness = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], value => { writes++; slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }];
    },
    useRef(initial) { const slot = cursor++; return slots[slot] ??= { current: initial }; },
    useEffect(callback) { if (!effectMounted) { effectMounted = true; cleanup = callback(); } },
  };
  return {
    render() { cursor = 0; return renderComponent(); },
    get writes() { return writes; },
    unmount() { cleanup?.(); },
  };
}
function mount(canEdit = true, token = "synthetic-session") {
  const commits = [];
  return { ...harness(() => useScoreEditor(canEdit, token, result => commits.push(result))), commits };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  const children = [node.props?.children].flat(Infinity);
  for (const child of children) { const match = find(child, predicate); if (match) return match; }
  return null;
}
const input = tree => find(tree, node => node.type === "input");
const submit = tree => find(tree, node => node.type === "form").props.onSubmit({ preventDefault() {} });

test("single-member save sends only changed score and commits after success", async () => {
  const app = mount();
  const calls = [];
  globalThis.keyboundSave = async (token, changes) => { calls.push({ token, changes }); return { ok: true, changes, updatedAt: 2 }; };
  try {
    assert.equal(await app.render().save(rows[1], "20"), true);
    assert.deepEqual(calls, [{ token: "synthetic-session", changes: [{ lodestoneId: "2", bestScore: 20 }] }]);
    assert.equal(app.commits.length, 1);
    assert.equal(app.render().savingId, null);
  } finally { app.unmount(); }
});

test("failed request unlocks editing and can retry without committing failed changes", async () => {
  const app = mount();
  try {
    globalThis.keyboundSave = async () => { throw new Error("Synthetic offline failure"); };
    await assert.rejects(app.render().save(rows[1], "20"), /Synthetic offline failure/);
    assert.equal(app.render().savingId, null);
    assert.equal(app.commits.length, 0);
    globalThis.keyboundSave = async (_, changes) => ({ ok: true, changes, updatedAt: 2 });
    assert.equal(await app.render().save(rows[1], "20"), true);
    assert.equal(app.commits.length, 1);
  } finally { app.unmount(); }
});

test("in-flight save locks other records and ignores late response after identity unmount", async () => {
  const app = mount();
  let resolve, calls = 0;
  globalThis.keyboundSave = () => { calls++; return new Promise(done => { resolve = done; }); };
  const first = app.render().save(rows[0], "30");
  assert.equal(app.render().savingId, "1");
  assert.equal(await app.render().save(rows[1], "40"), false);
  assert.equal(calls, 1);
  app.unmount();
  resolve({ ok: true, changes: [{ lodestoneId: "1", bestScore: 30 }], updatedAt: 2 });
  assert.equal(await first, false);
  assert.equal(app.commits.length, 0);
});

test("unauthorized sessions, absent tokens and invalid drafts cannot save; equivalent values make no call", async () => {
  let calls = 0;
  globalThis.keyboundSave = async () => { calls++; };
  for (const [allowed, token] of [[false, "token"], [true, null]]) {
    const app = mount(allowed, token);
    try { await assert.rejects(app.render().save(rows[0], "30"), /Boss or Underpaw/); }
    finally { app.unmount(); }
  }
  const app = mount();
  try {
    for (const draft of ["1e3", "-1", "1.5", "9007199254740992"]) await assert.rejects(app.render().save(rows[0], draft), /whole number/);
    assert.equal(await app.render().save(rows[0], "00010"), true);
    assert.equal(calls, 0);
  } finally { app.unmount(); }
});

test("clearing and zero remain distinct single-record mutations", async () => {
  const app = mount();
  const calls = [];
  globalThis.keyboundSave = async (_, changes) => { calls.push(changes); return { ok: true, changes, updatedAt: 2 }; };
  try {
    await app.render().save(rows[0], "");
    await app.render().save(rows[1], "0");
    assert.deepEqual(calls, [[{ lodestoneId: "1", bestScore: null }], [{ lodestoneId: "2", bestScore: 0 }]]);
  } finally { app.unmount(); }
});

test("popover keeps failed draft across dismissal, retries, and closes only on success", async () => {
  let failure = true;
  const calls = [];
  const editor = { savingId: null, async save(member, draft) { calls.push({ member, draft }); if (failure) throw new Error("Not saved offline"); return true; } };
  const app = harness(() => ScorePopover({ member: rows[1], editor }));
  try {
    app.render().props.onOpenChange(true);
    input(app.render()).props.onChange({ target: { value: "20" } });
    await submit(app.render());
    let tree = app.render();
    assert.equal(tree.props.open, true);
    assert.equal(input(tree).props.value, "20");
    assert.equal(find(tree, node => node.props?.role === "alert").props.children, "Not saved offline");
    tree.props.onOpenChange(false);
    app.render().props.onOpenChange(true);
    assert.equal(input(app.render()).props.value, "20");
    failure = false;
    await submit(app.render());
    tree = app.render();
    assert.equal(tree.props.open, false);
    assert.equal(input(tree).props.value, "5");
    assert.deepEqual(calls.map(call => call.draft), ["20", "20"]);
  } finally { app.unmount(); }
});

test("popover validates drafts, cancel discards without saving, and pending save prevents dismissal", async () => {
  let calls = 0;
  const editor = { savingId: null, async save() { calls++; return true; } };
  const app = harness(() => ScorePopover({ member: rows[0], editor }));
  try {
    app.render().props.onOpenChange(true);
    input(app.render()).props.onChange({ target: { value: "1e3" } });
    await submit(app.render());
    assert.equal(calls, 0);
    assert.equal(input(app.render()).props["aria-invalid"], true);
    input(app.render()).props.onChange({ target: { value: "30" } });
    editor.savingId = "1";
    app.render().props.onOpenChange(false);
    assert.equal(app.render().props.open, true);
    assert.equal(input(app.render()).props.disabled, true);
    editor.savingId = null;
    find(app.render(), node => node.type === "button" && node.props.children === "Cancel").props.onClick();
    assert.equal(app.render().props.open, false);
    assert.equal(input(app.render()).props.value, "10");
    assert.equal(calls, 0);
  } finally { app.unmount(); }
});
