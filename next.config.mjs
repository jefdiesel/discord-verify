/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Discord interactions endpoint needs the raw body for ed25519 verification.
    // App Router gives us req.text() directly, so nothing special needed here.
  },
};

export default nextConfig;
