module.exports = {
    env: {node: true},
    extends: [
      'eslint:recommended', 
      'plugin:@typescript-eslint/recommended', 
      'plugin:@typescript-eslint/recommended-requiring-type-checking', 
      'prettier',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'prettier'],
    root: true,
    parserOptions: {
      tsconfigRootDir: __dirname,
      project: ['./tsconfig.json'],
    },
    rules: {
      "prettier/prettier": "error"
    }
  };