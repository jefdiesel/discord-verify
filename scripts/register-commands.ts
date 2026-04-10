// One-shot script to register the /verify slash command with Discord.
// Run with: npm run register
//
// Requires DISCORD_APP_ID, DISCORD_BOT_TOKEN, and (optionally) DISCORD_GUILD_ID
// in your .env. With a guild ID it registers per-guild (instant). Without one
// it registers globally (can take up to 1 hour to propagate).

import "dotenv/config";

const APP_ID = process.env.DISCORD_APP_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !TOKEN) {
  console.error("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN in .env");
  process.exit(1);
}

const commands = [
  {
    name: "verify",
    description: "Verify your wallet to receive holder roles",
    type: 1,
  },
];

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log(`Registered commands ${GUILD_ID ? `in guild ${GUILD_ID}` : "globally"}.`);
