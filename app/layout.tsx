import type { ReactNode } from "react";

export const metadata = { title: "Verify", description: "Wallet verification for Discord" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#0b0d10",
          color: "#e6e8eb",
          margin: 0,
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
