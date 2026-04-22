import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import {ephemeralTokenPlugin} from './vite-plugins/ephemeral-token';

export default defineConfig(({mode}) => {
  // Side effect: loadEnv populates process.env for dev plugins below so the
  // ephemeral-token middleware can read GEMINI_API_KEY from .env.local.
  const env = loadEnv(mode, '.', '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return {
    plugins: [react(), tailwindcss(), ephemeralTokenPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          pitch: path.resolve(__dirname, 'pitch.html'),
          pitchru: path.resolve(__dirname, 'pitchru.html'),
          pitchuz: path.resolve(__dirname, 'pitchuz.html'),
          pitchsales: path.resolve(__dirname, 'pitchsales.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
