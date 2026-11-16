// Dos pestañas abiertas a la vez: lo que se crea en una aparece en la otra y no se pisa. Uso: npm run build && node scripts/verificar-dos-pestanas.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { stdio: 'ignore' });
const res = [];
const ok = (n, v, d = '') => { res.push(v); console.log(`${v ? 'OK ' : 'FALLA'}  ${n}${d ? ' — ' + d : ''}`); };
try {
  await esperar(2500);
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1480, height: 800 } });
  const A = await ctx.newPage(), B = await ctx.newPage();
  for (const p of [A, B]) await p.goto('http://localhost:4179/?depurar');
  await esperar(1500);
  const cont = (p) => p.locator('.mis-agentes .contador').innerText();
  const crear = async (p, nombre) => {
    await p.getByRole('button', { name: /Nuevo agente/ }).click();
    await p.getByLabel('Nombre').fill(nombre);
    await p.getByRole('button', { name: 'Guardar' }).click();
    await esperar(400);
  };
  await crear(B, 'Desde B');
  await esperar(600);
  ok('lo creado en la pestaña B aparece en la A', (await cont(A)).includes('10 agentes'), await cont(A));
  ok('y su personaje aparece en la A', (await A.evaluate(() => window.__oficina())).actores.length === 10);
  await crear(A, 'Desde A');
  await esperar(600);
  ok('lo creado en la A no pisa lo de la B: las dos tienen 11', (await cont(A)).includes('11 agentes') && (await cont(B)).includes('11 agentes'), `${await cont(A)} | ${await cont(B)}`);
  await B.reload(); await esperar(1500);
  ok('tras recargar, están los dos agentes nuevos', (await cont(B)).includes('11 agentes'));
  await nav.close();
  process.exitCode = res.every(Boolean) ? 0 : 1;
} finally { servidor.kill(); }
