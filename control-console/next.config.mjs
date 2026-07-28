const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd()
  },
  typescript: {
    tsconfigPath: "./tsconfig.json"
  }
};

export default nextConfig;
