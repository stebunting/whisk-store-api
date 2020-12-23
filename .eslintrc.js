module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    mocha: true
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
  },
  plugins: [
    '@typescript-eslint',
    'import'
  ],
  ignorePatterns: [
    'dist/**/*'
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      },
    }
  },
  rules: {
    'comma-dangle': 'off',
    'no-underscore-dangle': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      varsIgnorePattern: '^(debug|log|tag)$'
    }],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
  },
};
