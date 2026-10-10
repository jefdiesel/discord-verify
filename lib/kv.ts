import { Redis } from "@upstash/redis";

// Upstash REST client (was @vercel/kv). Created lazily so env is read per request on Workers.
let _kv: Redis | null = null;
const kv = new Proxy({} as Redis, {
  get(_t, prop) {
    _kv ??= new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
    const v = (_kv as any)[prop];
    return typeof v === "function" ? v.bind(_kv) : v;
  },
});
import type { Rule, VerifyToken, VerifiedAddress } from "./types";

// ---------- Verify tokens (one-time, short-lived) ----------

const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export async function putVerifyToken(token: string, data: VerifyToken) {
  await kv.set(`vt:${token}`, data, { ex: TOKEN_TTL_SECONDS });
}

export async function getVerifyToken(token: string): Promise<VerifyToken | null> {
  return (await kv.get<VerifyToken>(`vt:${token}`)) ?? null;
}

export async function consumeVerifyToken(token: string): Promise<VerifyToken | null> {
  const data = await getVerifyToken(token);
  if (data) await kv.del(`vt:${token}`);
  return data;
}

// ---------- SIWE / BIP-322 nonces ----------

export async function putNonce(nonce: string) {
  await kv.set(`nonce:${nonce}`, 1, { ex: 10 * 60 });
}

export async function consumeNonce(nonce: string): Promise<boolean> {
  const key = `nonce:${nonce}`;
  const exists = await kv.get(key);
  if (!exists) return false;
  await kv.del(key);
  return true;
}

// ---------- Rules ----------

const RULES_KEY = "rules";

export async function listRules(): Promise<Rule[]> {
  return (await kv.get<Rule[]>(RULES_KEY)) ?? [];
}

export async function saveRules(rules: Rule[]) {
  await kv.set(RULES_KEY, rules);
}

// ---------- Verified addresses (audit / un-verify support) ----------

export async function recordVerification(v: VerifiedAddress) {
  await kv.sadd(`user:${v.discordUserId}:addrs`, JSON.stringify(v));
}
