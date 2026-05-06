/**
 * Downloads FFXIV job icons from XIVAPI using the canonical gold-bordered
 * game icons at /i/062000/0621XX.png (the icons used on the Lodestone,
 * character select, and throughout the FFXIV UI).
 *
 * Run: node scripts/download-job-icons.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "assets", "jobs");
mkdirSync(OUT_DIR, { recursive: true });

// FFXIV job icon IDs in /i/062000/ — follows the ClassJob release order.
// 062125 = Blue Mage (limited job), intentionally skipped.
const JOBS = [
  { slug: "paladin",     id: 62110 },
  { slug: "monk",        id: 62111 },
  { slug: "warrior",     id: 62112 },
  { slug: "dragoon",     id: 62113 },
  { slug: "bard",        id: 62114 },
  { slug: "whitemage",   id: 62115 },
  { slug: "blackmage",   id: 62116 },
  { slug: "summoner",    id: 62117 },
  { slug: "scholar",     id: 62118 },
  { slug: "ninja",       id: 62119 },
  { slug: "machinist",   id: 62120 },
  { slug: "darkknight",  id: 62121 },
  { slug: "astrologian", id: 62122 },
  { slug: "samurai",     id: 62123 },
  { slug: "redmage",     id: 62124 },
  { slug: "gunbreaker",  id: 62126 },
  { slug: "dancer",      id: 62127 },
  { slug: "reaper",      id: 62128 },
  { slug: "sage",        id: 62129 },
  { slug: "viper",       id: 62130 },
  { slug: "pictomancer", id: 62131 },
];

let ok = 0, fail = 0;

for (const { slug, id } of JOBS) {
  const iconPath = `/i/062000/${String(id).padStart(6, "0")}.png`;
  const url = `https://xivapi.com${iconPath}`;
  const outPath = join(OUT_DIR, `${slug}.png`);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL  ${slug.padEnd(14)} ${iconPath}  →  ${res.status}`);
    fail++;
    continue;
  }
  const buf = await res.arrayBuffer();
  writeFileSync(outPath, Buffer.from(buf));
  console.log(`OK    ${slug.padEnd(14)} ${iconPath}`);
  ok++;

  await new Promise((r) => setTimeout(r, 80));
}

console.log(`\nDone: ${ok} OK, ${fail} failed`);
if (fail > 0) process.exit(1);
