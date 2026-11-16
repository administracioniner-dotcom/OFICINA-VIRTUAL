import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { oficinaPuente } from './vite-plugin-oficina';

export default defineConfig({
  plugins: [react(), oficinaPuente()],
  build: { chunkSizeWarningLimit: 1500 },
  // Puerto fijo: los agentes se guardan en el navegador por dirección, así que debe ser siempre la misma
  server: { port: 5173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
