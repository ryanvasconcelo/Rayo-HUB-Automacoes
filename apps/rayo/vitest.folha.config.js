import { defineConfig } from 'vitest/config';

/** Config isolado para testes Folha Dealer (evita carregar vite-plugin-fortes-api). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/folha-dealer-*.test.js'],
  },
});
