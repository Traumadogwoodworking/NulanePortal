import { createRequire } from "module";
import { dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let withAnalyzer = (config) => config;
const projectRoot = dirname(fileURLToPath(import.meta.url));

function parseFrameAncestors() {
  const raw = process.env.NEXT_PUBLIC_IFRAME_PARENT_ORIGINS;
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter((origin) => {
      if (!origin) return false;
      if (origin === "*") return true;
      try {
        const url = new URL(origin);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    });
}

const iframeHeaders = [
  {
    key: "Content-Security-Policy",
    value: `frame-ancestors ${["'self'", ...parseFrameAncestors()].join(" ")};`,
  },
];

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
  async headers() {
    return ["/login", "/login/:path*", "/portal", "/portal/:path*", "/home", "/home/:path*"].map(
      (source) => ({ source, headers: iframeHeaders }),
    );
  },
});

export default nextConfig;
