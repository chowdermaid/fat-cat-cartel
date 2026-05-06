const CLIENT_ID = process.env.FFLOGS_CLIENT_ID;
const CLIENT_SECRET = process.env.FFLOGS_CLIENT_SECRET;

const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
const tokRes = await fetch("https://www.fflogs.com/oauth/token", {
  method: "POST",
  headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=client_credentials",
});
const { access_token } = await tokRes.json();

const gql = (query, variables) =>
  fetch("https://www.fflogs.com/api/v2/client", {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());

const BARE_QUERY = `
  query($name: String!, $server: String!, $region: String!) {
    characterData {
      character(name: $name, serverSlug: $server, serverRegion: $region) {
        id
        name
        server { slug }
      }
    }
  }
`;

const tests = [
  { name: "Chowdermaid", server: "sophia",   region: "OC"      },
  { name: "Chowdermaid", server: "sophia",   region: "Oceania" },
  { name: "Chowdermaid", server: "Sophia",   region: "OC"      },
];

for (const vars of tests) {
  const r = await gql(BARE_QUERY, vars);
  const char = r?.data?.characterData?.character;
  const err = r.errors?.[0]?.message ?? "";
  console.log(`${vars.name} @ ${vars.server} (${vars.region}):`, char ? `FOUND id=${char.id}` : `null`, err);
}

// Test an active raider on a known AU server to confirm the mechanism works at all
const r = await gql(BARE_QUERY, { name: "Tenshi Shiro", server: "tonberry", region: "OC" });
console.log("Tonberry sanity check:", r?.data?.characterData?.character ? `FOUND id=${r.data.characterData.character.id}` : "null", r.errors?.[0]?.message ?? "");
