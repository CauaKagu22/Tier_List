// vite.config.ts

import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // ADICIONE ESTA LINHA EXATAMENTE ASSIM:
    base: '/Tier_List/',

    define: {
      // Essas duas linhas fazem a mesma coisa, pode deixar só uma se quiser.
      // Vou manter as duas para não causar confusão.
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});