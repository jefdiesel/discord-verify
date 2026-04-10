// Minimal Discord REST helper. We only need to grant roles; the rest of the
// bot is HTTP interactions, no gateway connection.

const API = "https://discord.com/api/v10";

function authHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

export async function grantRole(guildId: string, userId: string, roleId: string) {
  const res = await fetch(
    `${API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT", headers: authHeaders() }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`discord grantRole ${res.status}: ${await res.text()}`);
  }
}

export async function followupMessage(
  applicationId: string,
  interactionToken: string,
  body: { content: string; flags?: number }
) {
  const res = await fetch(
    `${API}/webhooks/${applicationId}/${interactionToken}`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    throw new Error(`discord followup ${res.status}: ${await res.text()}`);
  }
}
