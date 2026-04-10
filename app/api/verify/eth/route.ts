// Verify a SIWE signature, then evaluate ETH-side rules and grant roles.

import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { verify as verifyToken } from "@/lib/auth";
import { consumeNonce, consumeVerifyToken, recordVerification } from "@/lib/kv";
import { evaluateRules } from "@/lib/rules";
import { grantRole } from "@/lib/discord";

export const runtime = "nodejs";

type Body = {
  verifyToken: string; // signed token from /verify/[token]
  message: string; // SIWE message string the wallet signed
  signature: string; // 0x-prefixed sig
};

export async function POST(req: Request) {
  const { verifyToken: vt, message, signature } = (await req.json()) as Body;

  // 1. Validate the signed verify token (this proves the request is tied
  //    to a Discord user from a real /verify slash command).
  const payload = verifyToken<{ t: string; u: string; g: string }>(vt);
  if (!payload) return NextResponse.json({ ok: false, error: "bad token" }, { status: 400 });

  // 2. Validate SIWE
  let siwe: SiweMessage;
  try {
    siwe = new SiweMessage(message);
  } catch {
    return NextResponse.json({ ok: false, error: "bad SIWE message" }, { status: 400 });
  }

  const result = await siwe.verify({ signature });
  if (!result.success) {
    return NextResponse.json({ ok: false, error: "signature invalid" }, { status: 401 });
  }

  // 3. Nonce must be a real, unused one we issued.
  const nonceOk = await consumeNonce(siwe.nonce);
  if (!nonceOk) {
    return NextResponse.json({ ok: false, error: "nonce reused or expired" }, { status: 401 });
  }

  const ethAddress = siwe.address;

  // 4. Consume the verify-token (one-shot per slash command invocation).
  //    We do this *after* validating signature so users can retry on bad sigs.
  const tokenData = await consumeVerifyToken(payload.t);
  if (!tokenData) {
    return NextResponse.json({ ok: false, error: "verify session expired" }, { status: 410 });
  }

  // 5. Evaluate ETH-side rules and grant roles.
  const evaluated = await evaluateRules({ ethAddress });
  const granted: string[] = [];
  for (const { rule, granted: ok } of evaluated) {
    if (!ok) continue;
    try {
      await grantRole(tokenData.guildId, tokenData.discordUserId, rule.roleId);
      granted.push(rule.name);
    } catch (err) {
      console.error("grantRole failed", err);
    }
  }

  await recordVerification({
    discordUserId: tokenData.discordUserId,
    chain: "eth",
    address: ethAddress,
    verifiedAt: Date.now(),
  });

  return NextResponse.json({ ok: true, address: ethAddress, granted });
}
