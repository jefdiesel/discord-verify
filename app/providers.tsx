"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Multiple connector entries so users with Phantom + MetaMask both installed
// can pick the wallet they actually want, instead of whichever one wins the
// `window.ethereum` race.
const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ target: "phantom" }),
    injected({ target: "metaMask" }),
    injected(), // generic fallback
  ],
  transports: { [mainnet.id]: http() },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
