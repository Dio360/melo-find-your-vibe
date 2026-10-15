import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // `set-state-in-effect` flags our intentional "react to the needsAuth
  // store signal → open the auth modal" effect. That's a deliberate,
  // regression-tested pattern, so keep it visible as a warning rather than
  // a build-breaking error until it's deliberately refactored.
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext worker build output (generated).
    ".open-next/**",
  ]),
]);

export default eslintConfig;
