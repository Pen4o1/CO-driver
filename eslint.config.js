const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
  {
    files: ['src/core/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
            {
              name: 'react-native',
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
            {
              name: 'fetch',
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom', 'react-dom/*'],
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
            {
              group: ['react-native/*', 'react-native-*', '@react-native/*'],
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
            {
              group: ['expo', 'expo-*', 'expo/*', '@expo/*'],
              message:
                'src/core is pure TypeScript. No React, React Native, Expo, or network.',
            },
          ],
        },
      ],
    },
  },
]);
