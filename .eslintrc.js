module.exports = {
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  parserOptions: {
    sourceType: "module",
  },
  extends: "eslint:recommended",
  rules: {
    "no-console": "off",
    "semi": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"],
    "no-unused-vars": ["error", {"args": "none"}],
  },
};
