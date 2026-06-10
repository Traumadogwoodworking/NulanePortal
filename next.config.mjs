import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let withAnalyzer = (config) => config;
const projectRoot = dirname(fileURLToPath(import.meta.url));

if (process.env.ANALYZE === "true") {
  try {
    const analyzer = require("@next/bundle-analyzer");
    withAnalyzer = analyzer({
      enabled: true,
    });
  } catch (error) {
    console.warn("bundle-analyzer not available; skipping.", error?.message ?? error);
  }
}

const nextConfig = withAnalyzer({
  typedRoutes: false,
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  allowedDevOrigins: [
    "localhost",
    "172.17.189.65",
    "beatles-players-immediate-marijuana.trycloudflare.com",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nulanesystems.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "api.nulanesystems.com",
        pathname: "**",
      },
    ],
  },
});

export default nextConfig;
