import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { oficinaPuente } from './vite-plugin-oficina';

export default defineConfig({
  plugins: [react(), oficinaPuente()],
  build: { chunkSizeWarningLimit: 1500 },
  // Puerto fijo: los agentes se guardan en el navegador por dirección, así que debe ser siempre la misma
  // host 127.0.0.1: solo este ordenador y, en Windows, sin depender de que «localhost» sea IPv6.
  // fs.deny: la clave del puente (.oficina) nunca se sirve a ninguna web.
  server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.oficina/**'] } },
  preview: { host: '127.0.0.1' },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'agente-cae/**/*.test.mjs'] },
});
