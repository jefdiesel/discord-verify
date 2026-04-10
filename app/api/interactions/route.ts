// Discord HTTP interactions endpoint.
// Configure this URL in the Discord Developer Portal as your app's
// "Interactions Endpoint URL". Discord will PING it with a signed empty
// payload before saving — we must respond to PING (type 1) and verify
// every request's ed25519 signature.

import { NextResponse } from "next/server";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKey,
} from "discord-interactions";
import { sign, randomToken } from "@/lib/auth";
import { putVerifyToken } from "@/lib/kv";

export const runtime = "nodejs"; // discord-interactions uses node crypto

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp) {
    return new NextResponse("missing signature", { status: 401 });
  }

  const ok = await verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY!);
  if (!ok) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(body);

  // 1) PING — Discord verifies the endpoint
  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // 2) Slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const name: string = interaction.data?.name;

    if (name === "verify") {
      const userId: string = interaction.member?.user?.id ?? interaction.user?.id;
      const guildId: string = interaction.guild_id;

      // One-time token: short random string + KV record. We also sign it
      // so the verify page can read who it belongs to without an extra KV
      // round trip on initial render.
      const token = randomToken(24);
      await putVerifyToken(token, {
        discordUserId: userId,
        guildId,
        createdAt: Date.now(),
      });

      const signed = sign({ t: token, u: userId, g: guildId, iat: Date.now() });
      const url = `${process.env.PUBLIC_BASE_URL}/verify/${signed}`;

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content:
            `**Verify your wallet** to receive roles in this server.\n\n` +
            `Open the link below in a browser. It is one-time use and expires in 15 minutes.\n\n` +
            url,
        },
      });
    }
  }

  return new NextResponse("unhandled interaction", { status: 400 });
}
