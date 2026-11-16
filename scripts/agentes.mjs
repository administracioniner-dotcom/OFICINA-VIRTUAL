// Comprueba que los agentes simulados se ven y se mueven. Uso: npm run build && node scripts/agentes.mjs [prefijo]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const prefijo = process.argv[2] ?? 'ag';
mkdirSync('capturas', { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'ignore' });
const errores = [];
try {
  await esperar(2500);
  const nav = await chromium.launch();
  const p = await nav.newPage({ viewport: { width: 1480, height: 800 } });
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await p.goto('http://localhost:4174/?velocidad=2');
  await esperar(1500);
  await p.screenshot({ path: `capturas/${prefijo}-inicio.png` });
  await p.getByRole('button', { name: 'Sala de reuniones' }).click();
  for (let i = 1; i <= 16; i++) { await esperar(5000); await p.screenshot({ path: `capturas/${prefijo}-t${i}.png` }); }
  console.log('errores de consola:', JSON.stringify(errores));
  await nav.close();
} finally { servidor.kill(); }
