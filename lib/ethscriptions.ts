// Thin client around https://api.ethscriptions.com/v2
//
// We need to answer one question: "does this ETH address own at least one
// ethscription that is part of collection <slug>?"
//
// Strategy: page through the user's ethscriptions filtered by collection slug.
// The v2 ethscriptions endpoint supports filtering by `current_owner` and
// `collection_slug`, returning a list. If the result is non-empty, the user
// holds the collection.

const BASE = "https://api.ethscriptions.com/v2";

type EthscriptionListResponse = {
  result: Array<{
    transaction_hash: string;
    current_owner: string;
    collection_slug?: string;
  }>;
  pagination?: { has_more: boolean; page_key?: string };
};

export async function ownsEthscriptionInCollection(
  address: string,
  collectionSlug: string
): Promise<boolean> {
  const url = new URL(`${BASE}/ethscriptions`);
  url.searchParams.set("current_owner", address.toLowerCase());
  url.searchParams.set("collection_slug", collectionSlug);
  url.searchParams.set("max_results", "1");

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`ethscriptions api ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as EthscriptionListResponse;
  return Array.isArray(data.result) && data.result.length > 0;
}
