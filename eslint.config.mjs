import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "data/**",
    "next-env.d.ts",
  ]),
  {
    // Our dashboard pages follow the idiomatic fetch-on-mount pattern (async
    // load() called from useEffect). The rule's synchronous-setState heuristic
    // flags this legitimate pattern.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
