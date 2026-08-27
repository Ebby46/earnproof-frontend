import type { NextConfig } from "next";
import { buildSecurityPolicy, nextHeaderList } from "./config/security-headers";

const securityPolicy = buildSecurityPolicy();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: nextHeaderList(securityPolicy).map((header) => ({
          key: header.key,
          value: header.value,
        })),
      },
    ];
  },
};

export default nextConfig;
