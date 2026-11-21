import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist", "node_modules", ".data"] },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest }, parserOptions: { ecmaFeatures: { jsx: true } } },
    settings: { react: { version: "detect" } },
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, "react/prop-types": "error", "react-hooks/set-state-in-effect": "off" /* standard fetch-in-effect pattern */ },
  },
];
