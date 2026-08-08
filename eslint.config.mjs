import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const baseConfig = [...nextVitals, ...nextTs];

baseConfig.push({
  rules: {
    // These rules were promoted by the React 19 compiler preset. Existing
    // request-state effects remain valid while they are migrated incrementally.
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/purity": "warn",
    "react-hooks/preserve-manual-memoization": "warn",
    "react-hooks/immutability": "warn",
  },
});

if (process.env.ESLINT_PERF === "true") {
  let importCostPlugin = null;
  try {
    const module = await import("eslint-plugin-import-cost");
    importCostPlugin = module.default;
  } catch (error) {
    console.warn("eslint-plugin-import-cost not installed; skipping PERF plugin.", error?.message ?? error);
  }

  if (importCostPlugin) {
    baseConfig.push({
      plugins: {
        "import-cost": importCostPlugin,
      },
      rules: {
        "import-cost/import-cost": ["warn", { warnAt: 30 }],
      },
    });
  }
}

baseConfig.push(
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ])
);

export default defineConfig(baseConfig);
