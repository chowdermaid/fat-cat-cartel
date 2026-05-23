const { DISCORD_COMMANDS } = require("../lib/discord/commands");

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN before registering commands.");
  process.exit(1);
}

const route = guildId
  ? `applications/${applicationId}/guilds/${guildId}/commands`
  : `applications/${applicationId}/commands`;

fetch(`https://discord.com/api/v10/${route}`, {
  method: "PUT",
  headers: {
    "Authorization": `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(DISCORD_COMMANDS),
}).then(async (response) => {
  const body = await response.text();

  if (!response.ok) {
    console.error(`Discord command registration failed: ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  console.log(guildId ? `Registered guild commands for ${guildId}.` : "Registered global commands.");
}).catch((error) => {
  console.error("Discord command registration failed.");
  console.error(error);
  process.exit(1);
});
