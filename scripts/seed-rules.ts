// Seed the KV store with starter rules for CDC, COTD, and Nakamingos.
// Edit the `roleId` values before running, then: npx tsx scripts/seed-rules.ts
//
// You can re-run this any time — it overwrites the rules list. To preserve
// rules added via the admin UI, use the admin UI instead.

import "dotenv/config";
import { kv } from "@vercel/kv";
import type { Rule } from "../lib/types";

const rules: Rule[] = [
  {
    id: "cdc",
    kind: "facet_erc20",
    name: "CDC",
    roleId: "REPLACE_WITH_DISCORD_ROLE_ID",
    facetTokenAddress: "0xBB41E24dA83DcAb001bd085879c66cFCB4eED522",
    minBalance: "1",
  },
  {
    id: "cotd",
    kind: "facet_erc20",
    name: "COTD",
    roleId: "REPLACE_WITH_DISCORD_ROLE_ID",
    facetTokenAddress: "0x4C276E1b53C34E2fC659d76b091e54a8501F4c96",
    minBalance: "1",
  },
  {
    id: "nakamingos",
    kind: "facet_erc20",
    name: "Nakamingos",
    roleId: "REPLACE_WITH_DISCORD_ROLE_ID",
    facetTokenAddress: "0x531483D65EB7B75B5AdfC3331f301A836A0Eb3Bb",
    minBalance: "1",
  },
];

await kv.set("rules", rules);
console.log(`Seeded ${rules.length} rules. Now visit /admin and set the role IDs.`);
