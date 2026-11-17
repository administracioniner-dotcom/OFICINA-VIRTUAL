// Verifica en un navegador real que en un formulario se pueden escribir W, A, S, D (y «José») sin que se mueva la cámara,
// y que fuera del formulario WASD sigue moviendo la cámara.
// Uso: npm run build && node scripts/verificar-teclado-formulario.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort'], { stdio: 'ignore' });
const resultados = [];
const comprobar = (n, ok, d = '') => { resultados.push(ok); console.log(`${ok ? 'OK ' : 'FALLA'}  ${n}${d ? ' — ' + d : ''}`); };
try {
  await esperar(3000);
  const nav = await chromium.launch();
  const p = await (await nav.newContext({ viewport: { width: 1400, height: 800 } })).newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.goto('http://localhost:4182/?depurar'); await esperar(1500);
  const camara = async () => { const s = await p.evaluate(() => window.__oficina()); return s.aPantalla; };
  // acercar para que la cámara pueda moverse
  await p.getByRole('button', { name: 'CAE', exact: true }).click(); await esperar(900);

  await p.getByRole('button', { name: /Nuevo agente/ }).click();
  const campo = p.getByLabel('Nombre');
  await campo.click();
  const antes = await camara();
  await campo.pressSequentially('José, Ana, Wasd', { delay: 40 });
  await esperar(300);
  comprobar('se escribe «José, Ana, Wasd» completo (con la s, la a, la w y la d)', (await campo.inputValue()) === 'José, Ana, Wasd', JSON.stringify(await campo.inputValue()));
  const despues = await camara();
  comprobar('la cámara no se movió mientras se escribía', Math.abs(antes.x - despues.x) < 0.5 && Math.abs(antes.y - despues.y) < 0.5, `${antes.x.toFixed(1)},${antes.y.toFixed(1)} → ${despues.x.toFixed(1)},${despues.y.toFixed(1)}`);
  await p.keyboard.press('Escape'); await esperar(300);

  // fuera del formulario, WASD mueve la cámara
  await p.locator('canvas').click({ position: { x: 700, y: 400 } }).catch(() => {});
  const a = await camara();
  await p.keyboard.down('d'); await esperar(500); await p.keyboard.up('d');
  const b = await camara();
  comprobar('fuera del formulario, la D mueve la cámara', Math.abs(b.x - a.x) > 1, `${a.x.toFixed(1)} → ${b.x.toFixed(1)}`);
  comprobar('sin errores en la consola', errores.length === 0, errores.slice(0, 2).join(' | '));
  await nav.close();
} catch (e) { comprobar('el script terminó sin excepción', false, String(e)); }
finally { servidor.kill(); }
const f = resultados.filter((r) => !r).length;
console.log(f ? `\n${f} fallo(s)` : `\nTodo correcto (${resultados.length} comprobaciones)`);
process.exit(f ? 1 : 0);
