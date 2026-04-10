// Wallet sign-in page. The user lands here from the ephemeral Discord DM
// after running /verify. The `[token]` segment is an HMAC-signed payload
// (see lib/auth.ts) so we can render UI without a KV round-trip; the API
// routes are responsible for actually consuming the token.

import { verify } from "@/lib/auth";
import VerifyClient from "./client";

type Props = { params: Promise<{ token: string }> };

export default async function VerifyPage({ params }: Props) {
  const { token } = await params;
  const payload = verify<{ t: string; u: string; g: string; iat: number }>(token);

  if (!payload) {
    return (
      <main style={{ maxWidth: 560, margin: "80px auto", padding: 24 }}>
        <h1>Invalid link</h1>
        <p>This verification link is malformed or has been tampered with. Run <code>/verify</code> in Discord again.</p>
      </main>
    );
  }

  // Soft expiry check; the API also enforces a hard TTL via KV.
  const ageMin = (Date.now() - payload.iat) / 60_000;
  if (ageMin > 15) {
    return (
      <main style={{ maxWidth: 560, margin: "80px auto", padding: 24 }}>
        <h1>Link expired</h1>
        <p>Run <code>/verify</code> in Discord to get a new one.</p>
      </main>
    );
  }

  return <VerifyClient verifyToken={token} discordUserId={payload.u} />;
}
