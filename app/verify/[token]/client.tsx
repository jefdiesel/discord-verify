"use client";

import { useEffect, useState } from "react";
import { Providers } from "@/app/providers";
import { useAccount, useConnect, useSignMessage, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";

type Props = { verifyToken: string; discordUserId: string };

export default function VerifyClient(props: Props) {
  return (
    <Providers>
      <main style={{ maxWidth: 560, margin: "60px auto", padding: 24 }}>
        <h1>Verify your wallets</h1>
        <p style={{ opacity: 0.7 }}>
          Connect each wallet and sign the prompt. We never move funds — signatures
          only prove ownership of an address.
        </p>
        <Section title="Ethereum (ethscriptions)">
          <EthFlow {...props} />
        </Section>
        <Section title="Bitcoin (ordinal inscriptions)">
          <BtcFlow {...props} />
        </Section>
      </main>
    </Providers>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginTop: 32,
        padding: 20,
        background: "#13171c",
        border: "1px solid #1f262e",
        borderRadius: 12,
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

// ---------- ETH ----------

function EthFlow({ verifyToken }: Props) {
  const { address, isConnected, status: accountStatus } = useAccount();
  const { connectors, connect, status: connectStatus, error: connectError, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  // wagmi state hydrates from storage on the client; render a stable shell
  // until then so we don't flip from "Connect" to "Connected" on mount.
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ opacity: 0.5 }}>Loading…</div>;

  async function handleVerify() {
    if (!address) return;
    setBusy(true);
    setResult(null);
    try {
      const { nonce } = await fetch("/api/nonce").then((r) => r.json());
      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Verify wallet ownership for Discord roles.",
        uri: window.location.origin,
        version: "1",
        chainId: 1,
        nonce,
      });
      const message = siwe.prepareMessage();
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/verify/eth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verifyToken, message, signature }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(
          data.granted.length > 0
            ? `Verified ${address.slice(0, 6)}…${address.slice(-4)}. Granted: ${data.granted.join(", ")}`
            : `Verified ${address.slice(0, 6)}…${address.slice(-4)}, but no rules matched.`
        );
      } else {
        setResult(`Failed: ${data.error}`);
      }
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // Always show a "force reset" path so users stuck in a half-connected
  // state from a multi-wallet browser (Phantom + MetaMask both injecting)
  // can recover.
  function forceReset() {
    reset();
    disconnect();
    setResult(null);
  }

  if (!isConnected || !address) {
    return (
      <div>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 0 }}>
          Status: {accountStatus} {connectStatus === "pending" && "· connecting…"}
        </p>
        {connectors.length === 0 && (
          <p style={{ color: "#fbbf24" }}>
            No injected wallet detected. Install Phantom, MetaMask, or another browser wallet.
          </p>
        )}
        {connectors.map((c) => (
          <button
            key={c.uid}
            onClick={() => connect({ connector: c })}
            disabled={connectStatus === "pending"}
            style={btn}
          >
            Connect {c.name}
          </button>
        ))}
        {connectError && (
          <p style={{ color: "#f87171", marginTop: 12, fontSize: 13 }}>
            Connect failed: {connectError.message}
          </p>
        )}
        <button onClick={forceReset} style={{ ...btn, background: "transparent", border: "1px solid #2a3340", marginTop: 12 }}>
          Reset
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: "monospace", fontSize: 13 }}>{address}</p>
      <button onClick={handleVerify} disabled={busy} style={btn}>
        {busy ? "Verifying…" : "Sign & verify"}
      </button>
      <button onClick={forceReset} style={{ ...btn, background: "transparent", border: "1px solid #2a3340" }}>
        Disconnect
      </button>
      {result && <p style={{ marginTop: 12 }}>{result}</p>}
    </div>
  );
}

// ---------- BTC ----------

declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      signMessage: (msg: string, type?: "ecdsa" | "bip322-simple") => Promise<string>;
    };
  }
}

function BtcFlow({ verifyToken }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!window.unisat) {
      setResult("Install Unisat (or another BIP-322 capable wallet) to continue.");
      return;
    }
    const accounts = await window.unisat.requestAccounts();
    setAddress(accounts[0] ?? null);
  }

  async function handleVerify() {
    if (!address || !window.unisat) return;
    setBusy(true);
    setResult(null);
    try {
      const { nonce } = await fetch("/api/nonce").then((r) => r.json());
      const message = `Verify wallet ownership for Discord roles.\n\nAddress: ${address}\nNonce: ${nonce}`;
      const signature = await window.unisat.signMessage(message, "bip322-simple");

      const res = await fetch("/api/verify/btc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verifyToken, address, message, signature, nonce }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(
          data.granted.length > 0
            ? `Verified. Granted: ${data.granted.join(", ")}`
            : `Verified, but no rules matched.`
        );
      } else {
        setResult(`Failed: ${data.error}`);
      }
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <div>
        <button onClick={connect} style={btn}>Connect Unisat</button>
        {result && <p style={{ marginTop: 12 }}>{result}</p>}
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: "monospace", fontSize: 13 }}>{address}</p>
      <button onClick={handleVerify} disabled={busy} style={btn}>
        {busy ? "Verifying…" : "Sign & verify"}
      </button>
      {result && <p style={{ marginTop: 12 }}>{result}</p>}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  marginRight: 8,
  fontSize: 14,
};
