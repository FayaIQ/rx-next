import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Serwist rewrites public/sw.js on each compile — that retriggers the dev watcher loop.
  disable: process.env.SERWIST_DISABLE === "true" || isDev,
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default withSerwist(nextConfig);
