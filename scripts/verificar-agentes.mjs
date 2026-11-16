// Verifica en un navegador real que los agentes simulados se sientan en reuniones y nunca pisan muros.
// Uso: npm run build && node scripts/verificar-agentes.mjs [segundos] [velocidad]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const segundos = Number(process.argv[2] ?? 90), velocidad = Number(process.argv[3] ?? 2);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { stdio: 'ignore' });
try {
  await esperar(2500);
  const nav = await chromium.launch();
  const p = await nav.newPage({ viewport: { width: 1480, height: 800 } });
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await p.goto(`http://localhost:4175/?velocidad=${velocidad}&depurar`);
  await esperar(1500);
  await p.getByRole('button', { name: 'Sala de reuniones' }).click();
  await esperar(800);
  let maxEnReunion = 0, muestras = 0, enBloqueada = 0, caminando = 0, silletasRepetidas = 0;
  const vistos = new Set();
  for (let t = 0; t < segundos; t++) {
    const s = await p.evaluate(() => window.__oficina());
    muestras++;
    const sentadosReunion = s.actores.filter((a) => a.sentado && a.tipo === 'reuniones');
    if (sentadosReunion.length > maxEnReunion) { maxEnReunion = sentadosReunion.length; await p.screenshot({ path: 'capturas/reunion.png' }); }
    if (new Set(sentadosReunion.map((a) => a.asiento)).size !== sentadosReunion.length) silletasRepetidas++;
    for (const a of s.actores) {
      vistos.add(a.id);
      if (a.sentado) continue;
      caminando++;
      const cx = Math.floor(a.x / 32), cy = Math.floor(a.y / 32);
      // los tramos de la silla a la baldosa de acceso están dentro del mueble: se ignoran cerca de las sillas
      if (s.bloqueada[cy]?.[cx]) enBloqueada++;
    }
    await esperar(1000);
  }
  console.log(JSON.stringify({ agentesVistos: vistos.size, muestras, maxSentadosEnReunion: maxEnReunion, muestrasCaminando: caminando, muestrasEnBaldosaBloqueada: enBloqueada, sillasRepetidas: silletasRepetidas, errores }));
  await nav.close();
} finally { servidor.kill(); }
