// Capturas con Playwright (preinstalado en el entorno; no es dependencia del proyecto).
// Uso: node scripts/captura.mjs [prefijo]   — requiere `npm run build` previo.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const prefijo = process.argv[2] ?? 'captura';
const PUERTO = 4173;
mkdirSync('capturas', { recursive: true });

const servidor = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await esperar(2500);
  const navegador = await chromium.launch();
  const errores = [];
  const pagina = await navegador.newPage({ viewport: { width: 1480, height: 800 } });
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await pagina.goto(`http://localhost:${PUERTO}/`);
  await esperar(1500);
  await pagina.screenshot({ path: `capturas/${prefijo}-mapa.png` });
  console.log('errores de consola:', JSON.stringify(errores));
  await navegador.close();
} finally {
  servidor.kill();
}
