import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js defaults
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Your overrides
  ...compat.config({
    // you can also `extends: ['next']` here if needed
    rules: {
      // choose ONE of these:
      "@typescript-eslint/no-explicit-any": "warn", // recommended
      // "@typescript-eslint/no-explicit-any": "off", // or fully disable
    },
  }),

  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
