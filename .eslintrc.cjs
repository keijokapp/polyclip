module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: "module",
  },
  rules: {
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 120 }],
    "no-constant-condition": ["error", { checkLoops: false }],
    semi: ["error", "never"],
    quotes: ["error", "double"],
    "comma-dangle": ["error", "only-multiline"],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-this-alias": "off"
  },
}
