// 📁 backend/jest.config.js
// Jest-Konfiguration für Backend-Tests

module.exports = {
  // Test-Umgebung
  testEnvironment: 'node',

  // Test-Dateien finden
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage-Konfiguration
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**'
  ],

  // Coverage-Schwellenwerte (deaktiviert bis mehr Tests vorhanden)
  // coverageThreshold: {
  //   global: {
  //     branches: 20,
  //     functions: 20,
  //     lines: 20,
  //     statements: 20
  //   }
  // },

  // Setup-Dateien
  setupFilesAfterEnv: ['./tests/setup.js'],

  // Timeouts
  testTimeout: 10000,

  // Verbose Output
  verbose: true
};
