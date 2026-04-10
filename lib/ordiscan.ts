// Bitcoin ordinal inscription ownership lookup via Ordiscan.
// (Hiro's Ordinals API was deprecated in March 2026.)
//
// We resolve the *current* owner of each allow-listed inscription ID and
// check whether it matches the verified BTC address. We do this rather than
// listing all the user's inscriptions because the allowlist is typically
// small (admin-curated), so per-id lookups are cheaper than paginating
// through a possibly-large wallet.

const BASE = "https://api.ordiscan.com/v1";

type InscriptionInfo = {
  inscription_id: string;
  owner_address: string;
};

async function fetchInscription(inscriptionId: string): Promise<InscriptionInfo | null> {
  const key = process.env.ORDISCAN_API_KEY;
  if (!key) throw new Error("ORDISCAN_API_KEY not set");

  const res = await fetch(`${BASE}/inscription/${encodeURIComponent(inscriptionId)}`, {
    headers: { Authorization: `Bearer ${key}`, accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ordiscan ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: InscriptionInfo };
  return json.data;
}

export async function ownsAnyInscription(
  btcAddress: string,
  inscriptionIds: string[]
): Promise<boolean> {
  // Run lookups in parallel; bail as soon as one matches.
  const checks = inscriptionIds.map(async (id) => {
    const info = await fetchInscription(id);
    return info?.owner_address === btcAddress;
  });
  const results = await Promise.all(checks);
  return results.some(Boolean);
}
