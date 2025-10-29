import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Remove webpack config and experimental options for Turbopack compatibility
  transpilePackages: [
    "@azure/msal-browser",
    "@azure/msal-react",
    "@azure/msal-common",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.constantcontact.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
