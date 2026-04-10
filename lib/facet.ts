// Facet appchain client. ethscriptions.com tokens like CDC, COTD, Nakamingos
// are deployed as standard ERC-20 contracts on Facet (chain id 1027303), so
// we just call balanceOf via JSON-RPC.

import { createPublicClient, http, defineChain, erc20Abi, getAddress, formatUnits } from "viem";

const facet = defineChain({
  id: 1_027_303,
  name: "Facet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.FACET_RPC_URL || "https://mainnet.facet.org"] },
  },
  blockExplorers: {
    default: { name: "Ethscriptions Explorer", url: "https://explorer.ethscriptions.com" },
  },
});

const client = createPublicClient({ chain: facet, transport: http() });

/**
 * Returns the user's raw token balance (as a bigint, in base units).
 */
export async function balanceOf(tokenAddress: string, holder: string): Promise<bigint> {
  return await client.readContract({
    address: getAddress(tokenAddress),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [getAddress(holder)],
  });
}

/**
 * Returns true if `holder` owns at least `minBalance` of the given token.
 * `minBalance` is in human units (e.g. "1", "0.5") and is converted using
 * the token's on-chain decimals.
 */
export async function holdsAtLeast(
  tokenAddress: string,
  holder: string,
  minBalanceHuman: string
): Promise<boolean> {
  const [bal, decimals] = await Promise.all([
    balanceOf(tokenAddress, holder),
    client.readContract({
      address: getAddress(tokenAddress),
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);
  const min = parseUnits(minBalanceHuman, decimals);
  return bal >= min;
}

// Tiny parseUnits without bringing in another import.
function parseUnits(value: string, decimals: number): bigint {
  const [whole, frac = ""] = value.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

// Re-export so callers can format if they want to display.
export { formatUnits };
