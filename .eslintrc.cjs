module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  root: true,
  rules: {
    // Disable ESLint formatting rules that conflict with Prettier
    indent: "off",
    "@typescript-eslint/indent": "off",
  },
};
