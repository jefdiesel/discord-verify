"use client";

import { useState } from "react";

export default function LoginForm() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setErr("Wrong password");
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "120px auto", padding: 24 }}>
      <h1>Admin login</h1>
      <form onSubmit={submit}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #2a3340",
            background: "#13171c",
            color: "#e6e8eb",
            marginBottom: 12,
          }}
        />
        <button
          type="submit"
          style={{
            background: "#3b82f6",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Sign in
        </button>
        {err && <p style={{ color: "#f87171" }}>{err}</p>}
      </form>
    </main>
  );
}
