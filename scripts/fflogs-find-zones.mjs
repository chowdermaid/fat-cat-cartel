/**
 * Dumps all FFLogs zones relevant to FFXIV raid content.
 * Run: FFLOGS_CLIENT_ID=x FFLOGS_CLIENT_SECRET=y node scripts/fflogs-find-zones.mjs
 */
const CLIENT_ID = process.env.FFLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.FFLOGS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set FFLOGS_CLIENT_ID and FFLOGS_CLIENT_SECRET env vars");
  process.exit(1);
}

async function getToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://www.fflogs.com/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function queryFFLogs(token, query) {
  const res = await fetch("https://www.fflogs.com/api/v2/client", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
  return res.json();
}

const ZONES_QUERY = `
  query {
    worldData {
      zones {
        id
        name
        difficulties { id name }
        encounters { id name }
      }
    }
  }
`;

const token = await getToken();
const result = await queryFFLogs(token, ZONES_QUERY);
if (result.errors) { console.error("Errors:", result.errors); process.exit(1); }
const zones = result.data.worldData.zones;

// Keywords that identify relevant FFXIV content (not PvP/misc)
const RELEVANT = [
  "aac", "anabaseios", "abyssos", "asphodelos",          // savage raids
  "eden", "eden's", "e1s", "e5s", "e9s",
  "omega", "o1s", "o5s", "o9s", "o12s",
  "alexander", "a1s", "a5s", "a9s",
  "coils", "bahamut",
  "unending coil", "weapon's refrain", "epic of alexander",
  "dragonsong", "omega protocol", "futures rewritten",    // ultimates
  "extreme", "trial",                                     // extreme trials
  "alliance",                                             // alliance raids
  "criterion",
  "light-heavyweight", "cruiserweight", "heavyweight",
  "vana'diel", "echoes",
];

const filtered = zones.filter((z) => {
  const n = z.name.toLowerCase();
  return RELEVANT.some((k) => n.includes(k));
});

for (const z of filtered) {
  const diffs = z.difficulties?.map((d) => `${d.id}=${d.name}`).join(", ") ?? "none";
  console.log(`\n[Zone ${z.id}] ${z.name}`);
  console.log(`  Difficulties: ${diffs}`);
  for (const e of z.encounters ?? []) {
    console.log(`    [Enc ${e.id}] ${e.name}`);
  }
}

console.log(`\n\n--- ALL ZONES (for reference) ---`);
for (const z of zones) {
  console.log(`[${z.id}] ${z.name}`);
}
