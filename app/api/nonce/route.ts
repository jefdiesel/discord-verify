// Issue a nonce for SIWE / BIP-322 signing. The verify page calls this
// before asking the user to sign.

import { NextResponse } from "next/server";
import { randomToken } from "@/lib/auth";
import { putNonce } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET() {
  const nonce = randomToken(16);
  await putNonce(nonce);
  return NextResponse.json({ nonce });
}
