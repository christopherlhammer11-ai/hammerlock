import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist-electron/**",
      "apps/**",
      "discord-bot/**",
      "electron/**",
      "public/**",
    ],
  },
  {
    rules: {
      // Relax rules for gradual adoption — tighten over time
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-empty": "warn",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "preserve-caught-error": "warn",
    },
  },
  {
    files: ["bin/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
      },
    },
  }
);
