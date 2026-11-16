// Mide fotogramas por segundo con 9 y con 14 agentes. Uso: npm run build && node scripts/rendimiento.mjs [segundos]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const segundos = Number(process.argv[2] ?? 10);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4177', '--strictPort'], { stdio: 'ignore' });
try {
  await esperar(2500);
  const nav = await chromium.launch();
  for (const [nombre, query] of [['9 agentes', '?velocidad=3'], ['14 agentes', '?velocidad=3&agentes=14']]) {
    const p = await nav.newPage({ viewport: { width: Number(process.env.ANCHO ?? 1480), height: Number(process.env.ALTO ?? 800) } });
    await p.goto(`http://localhost:4177/${query}`);
    await esperar(2000);
    // se mueve el ratón sin pulsar para que el navegador de pruebas no trate la página como inactiva
    let activo = true;
    const mover = (async () => { let i = 0; while (activo) { await p.mouse.move(700 + (i++ % 20), 400); await esperar(30); } })();
    const r = await p.evaluate((ms) => new Promise((resolve) => {
      const marcas = []; const t0 = performance.now();
      const f = () => { marcas.push(performance.now()); if (performance.now() - t0 < ms) requestAnimationFrame(f); else resolve(marcas); };
      requestAnimationFrame(f);
    }), segundos * 1000);
    activo = false; await mover;
    const dts = r.slice(1).map((t, i) => t - r[i]);
    const medio = 1000 / (dts.reduce((a, b) => a + b, 0) / dts.length);
    const peor = 1000 / [...dts].sort((a, b) => b - a)[Math.floor(dts.length * 0.01)];
    console.log(`${nombre}: ${medio.toFixed(1)} fps de media; el 1 % peor de los fotogramas llega a ${peor.toFixed(1)} fps`);
    await p.close();
  }
  await nav.close();
} finally { servidor.kill(); }
