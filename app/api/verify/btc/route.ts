// Verify a BIP-322 signature for a BTC address, then evaluate ordinal rules.
//
// BIP-322 is the modern signing standard supported by Xverse, Unisat, Leather,
// and OKX wallets. We use the bip322-js library which handles legacy, segwit,
// and taproot variants in one verify() call.

import { NextResponse } from "next/server";
import { Verifier } from "bip322-js";
import { verify as verifyToken } from "@/lib/auth";
import { consumeNonce, consumeVerifyToken, recordVerification } from "@/lib/kv";
import { evaluateRules } from "@/lib/rules";
import { grantRole } from "@/lib/discord";

export const runtime = "nodejs";

type Body = {
  verifyToken: string;
  address: string; // BTC address (taproot ideally, since ordinals live there)
  message: string; // the message the wallet signed (must include our nonce)
  signature: string; // base64-encoded BIP-322 signature
  nonce: string; // the nonce we embedded in `message`
};

export async function POST(req: Request) {
  const { verifyToken: vt, address, message, signature, nonce } = (await req.json()) as Body;

  const payload = verifyToken<{ t: string; u: string; g: string }>(vt);
  if (!payload) return NextResponse.json({ ok: false, error: "bad token" }, { status: 400 });

  // Defense in depth: insist the signed message contains the nonce we issued.
  if (!message.includes(nonce)) {
    return NextResponse.json({ ok: false, error: "nonce not in message" }, { status: 400 });
  }

  let valid = false;
  try {
    valid = Verifier.verifySignature(address, message, signature);
  } catch (err) {
    console.error("bip322 verify error", err);
  }
  if (!valid) {
    return NextResponse.json({ ok: false, error: "signature invalid" }, { status: 401 });
  }

  const nonceOk = await consumeNonce(nonce);
  if (!nonceOk) {
    return NextResponse.json({ ok: false, error: "nonce reused or expired" }, { status: 401 });
  }

  const tokenData = await consumeVerifyToken(payload.t);
  if (!tokenData) {
    return NextResponse.json({ ok: false, error: "verify session expired" }, { status: 410 });
  }

  const evaluated = await evaluateRules({ btcAddress: address });
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
    chain: "btc",
    address,
    verifiedAt: Date.now(),
  });

  return NextResponse.json({ ok: true, address, granted });
}
