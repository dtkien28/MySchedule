import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: '../testing/cypress/support/e2e.js',
    specPattern: '../testing/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: '../testing/cypress/fixtures',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
