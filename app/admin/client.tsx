"use client";

import { useState } from "react";
import type { Rule, RuleKind } from "@/lib/types";

export default function AdminClient({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addRule(kind: RuleKind) {
    const base = { id: crypto.randomUUID(), kind, roleId: "" };
    let rule: Rule;
    if (kind === "ethscriptions_collection") {
      rule = { ...base, name: "New ethscriptions rule", collectionSlug: "" };
    } else if (kind === "facet_erc20") {
      rule = { ...base, name: "New Facet token rule", facetTokenAddress: "", minBalance: "1" };
    } else {
      rule = { ...base, name: "New ordinal rule", inscriptionIds: [] };
    }
    setRules([...rules, rule]);
  }

  function update(id: string, patch: Partial<Rule>) {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function remove(id: string) {
    setRules(rules.filter((r) => r.id !== id));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved" : "Save failed");
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h1>Verification rules</h1>
      <p style={{ opacity: 0.7 }}>
        Each rule maps a Discord role to a holdings check. Users get every role whose
        check passes against their verified wallet.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button onClick={() => addRule("facet_erc20")} style={btn}>+ Facet token rule</button>
        <button onClick={() => addRule("ethscriptions_collection")} style={btn}>+ Ethscriptions collection</button>
        <button onClick={() => addRule("ordinal_inscription")} style={btn}>+ Ordinal rule</button>
        <button onClick={save} disabled={saving} style={{ ...btn, background: "#10b981", marginLeft: "auto" }}>
          {saving ? "Saving…" : "Save all"}
        </button>
      </div>
      {msg && <p>{msg}</p>}

      {rules.length === 0 && <p style={{ opacity: 0.6 }}>No rules yet. Add one above.</p>}

      {rules.map((rule) => (
        <div key={rule.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ opacity: 0.6, fontSize: 12, textTransform: "uppercase" }}>{rule.kind}</strong>
            <button onClick={() => remove(rule.id)} style={{ ...btn, background: "#7f1d1d" }}>Remove</button>
          </div>
          <Field label="Name (shown to users)">
            <input value={rule.name} onChange={(e) => update(rule.id, { name: e.target.value })} style={input} />
          </Field>
          <Field label="Discord role ID">
            <input
              value={rule.roleId}
              onChange={(e) => update(rule.id, { roleId: e.target.value })}
              placeholder="e.g. 1234567890123456789"
              style={input}
            />
          </Field>

          {rule.kind === "ethscriptions_collection" && (
            <Field label="Collection slug (from explorer.ethscriptions.com)">
              <input
                value={rule.collectionSlug ?? ""}
                onChange={(e) => update(rule.id, { collectionSlug: e.target.value })}
                placeholder="e.g. ethereum-punks"
                style={input}
              />
            </Field>
          )}

          {rule.kind === "facet_erc20" && (
            <>
              <Field label="Token contract address (Facet appchain)">
                <input
                  value={rule.facetTokenAddress ?? ""}
                  onChange={(e) => update(rule.id, { facetTokenAddress: e.target.value })}
                  placeholder="0x..."
                  style={{ ...input, fontFamily: "monospace" }}
                />
              </Field>
              <Field label="Minimum balance (human units)">
                <input
                  value={rule.minBalance ?? "1"}
                  onChange={(e) => update(rule.id, { minBalance: e.target.value })}
                  placeholder="1"
                  style={input}
                />
              </Field>
            </>
          )}

          {rule.kind === "ordinal_inscription" && (
            <Field label="Inscription IDs (one per line — owning ANY one passes)">
              <textarea
                value={(rule.inscriptionIds ?? []).join("\n")}
                onChange={(e) =>
                  update(rule.id, {
                    inscriptionIds: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={6}
                style={{ ...input, fontFamily: "monospace", fontSize: 12 }}
              />
            </Field>
          )}
        </div>
      ))}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  background: "#13171c",
  border: "1px solid #1f262e",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  borderRadius: 6,
  border: "1px solid #2a3340",
  background: "#0b0d10",
  color: "#e6e8eb",
};

const btn: React.CSSProperties = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};
