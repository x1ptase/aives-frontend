const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['android/**','ios/**','.android-sdk/**','.gradle-local/**','.cxx/**','modules/**/android/build/**','dist*/**','artifacts/**'] },
]);
