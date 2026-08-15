import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma writes this; it is machine-generated and already @ts-nocheck.
    "src/generated/**",
    // The sandbox worker is a standalone CommonJS Node service with no
    // relationship to the Next.js app or its module system.
    "sandbox/**",
  ]),
]);

export default eslintConfig;
