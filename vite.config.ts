import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
