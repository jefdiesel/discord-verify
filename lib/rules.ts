// Rule evaluation engine. Given the user's verified addresses and the full
// rules list, returns the set of role IDs they qualify for.

import { listRules } from "./kv";
import { ownsEthscriptionInCollection } from "./ethscriptions";
import { holdsAtLeast } from "./facet";
import { ownsAnyInscription } from "./ordiscan";
import type { Rule } from "./types";

export async function evaluateRules(opts: {
  ethAddress?: string;
  btcAddress?: string;
}): Promise<{ rule: Rule; granted: boolean }[]> {
  const rules = await listRules();

  const evaluated = await Promise.all(
    rules.map(async (rule) => {
      try {
        let granted = false;

        if (rule.kind === "ethscriptions_collection" && opts.ethAddress && rule.collectionSlug) {
          granted = await ownsEthscriptionInCollection(opts.ethAddress, rule.collectionSlug);
        } else if (rule.kind === "facet_erc20" && opts.ethAddress && rule.facetTokenAddress) {
          granted = await holdsAtLeast(rule.facetTokenAddress, opts.ethAddress, rule.minBalance || "1");
        } else if (rule.kind === "ordinal_inscription" && opts.btcAddress && rule.inscriptionIds?.length) {
          granted = await ownsAnyInscription(opts.btcAddress, rule.inscriptionIds);
        }

        return { rule, granted };
      } catch (err) {
        console.error(`rule ${rule.id} eval failed:`, err);
        return { rule, granted: false };
      }
    })
  );

  return evaluated;
}
