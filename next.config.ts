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
  turbopack: {
    root: process.cwd(),
  },
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "pg-native": false,
    };
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "util/types": false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        dns: false,
        fs: false,
        net: false,
        tls: false,
        util: false,
        "util/types": false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/storage/:path*",
      },
    ];
  },
};

export default withSerwist(nextConfig);
