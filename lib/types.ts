// Shared types

export type RuleKind =
  | "ethscriptions_collection" // legacy: api.ethscriptions.com collection slug
  | "facet_erc20" // ERC-20 holdings on Facet (CDC, COTD, Nakamingos, etc.)
  | "ordinal_inscription";

/**
 * A single gate rule. When a user verifies, every rule is evaluated against
 * their connected wallet(s); each rule that matches grants its `roleId`.
 */
export type Rule = {
  id: string;
  kind: RuleKind;
  roleId: string; // Discord role to grant
  name: string; // human label shown in admin

  // For ethscriptions_collection: the ethscriptions.com collection slug
  // (e.g. "ethereum-punks"). At least one ethscription owned by the user
  // must belong to this collection.
  collectionSlug?: string;

  // For facet_erc20: token contract address on the Facet appchain and
  // minimum balance (in human units, e.g. "1") required to pass.
  facetTokenAddress?: string;
  minBalance?: string;

  // For ordinal_inscription: list of inscription IDs the user must own AT
  // LEAST ONE of (the manually-curated allowlist).
  inscriptionIds?: string[];
};

export type VerifyToken = {
  discordUserId: string;
  guildId: string;
  createdAt: number; // ms epoch
};

export type VerifiedAddress = {
  discordUserId: string;
  chain: "eth" | "btc";
  address: string;
  verifiedAt: number;
};
