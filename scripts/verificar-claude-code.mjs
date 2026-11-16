// Verifica en un navegador real el agente «real»: crearlo, ver «Sin señal», pegar la configuración,
// y recibir avisos de hook de EJEMPLO (no hay un Claude Code real) lanzando puente/hook.mjs de verdad.
// Uso: npm run build && node scripts/verificar-claude-code.mjs
import { execFile, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
mkdirSync('capturas', { recursive: true });
const PUERTO = 4179;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { stdio: 'ignore' });
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => { resultados.push(ok); console.log(`${ok ? 'OK ' : 'FALLA'}  ${nombre}${detalle ? ' — ' + detalle : ''}`); };
const NOMBRE = 'Claude de prueba';
const aviso = (obj) => new Promise((res) => {
  const h = execFile('node', ['puente/hook.mjs', '--agente', NOMBRE, '--puerto', String(PUERTO)], () => res());
  h.stdin.end(JSON.stringify(obj));
});
try {
  await esperar(3000);
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1480, height: 800 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  const abrir = async () => { await p.goto(`http://localhost:${PUERTO}/?depurar`); await esperar(1500); };
  const ficha = () => p.locator('aside.ficha');
  const IDS = ['direccion-1','ingenieria-1','ingenieria-2','compras-1','recepcion-1','desarrollo-1','marketing-1','cae-1','admin-1'];
  const seleccionarNuevo = async () => {
    const s = await p.evaluate(() => window.__oficina());
    const nuevo = s.actores.find((a) => !IDS.includes(a.id));
    await p.getByRole('button', { name: nuevo.id.startsWith('direccion') ? 'Dirección' : 'Ingeniería' }).click();
    await esperar(1000);
    const s2 = await p.evaluate(() => window.__oficina());
    const a2 = s2.actores.find((a) => a.id === nuevo.id);
    await p.mouse.click((a2.x - s2.aPantalla.x) * s2.aPantalla.zoom, (a2.y - 10 - s2.aPantalla.y) * s2.aPantalla.zoom);
    await esperar(400);
    return nuevo.id;
  };

  await abrir();
  await p.getByRole('button', { name: /Nuevo agente/ }).click();
  await p.getByLabel('Nombre').fill(NOMBRE);
  await p.getByLabel(/Real: lo mueve/).check();
  comprobar('el formulario explica que un agente real solo se mueve con su Claude Code', (await p.locator('.formulario .nota').innerText()).includes('solo se mueve'));
  await p.screenshot({ path: 'capturas/claude-formulario.png' });
  await p.getByRole('button', { name: 'Guardar' }).click();
  await esperar(500);
  const id = await seleccionarNuevo();
  comprobar('su ficha dice «Real · Claude Code»', (await ficha().innerText()).includes('Real · Claude Code'));
  comprobar('sin avisos aún está «Sin señal» y «Esperando»', (await ficha().innerText()).includes('Sin señal') && (await ficha().innerText()).includes('Esperando'));
  comprobar('la marca de abajo cuenta 1 real', (await p.locator('.marca').innerText()).includes('+ 1 real'));

  await p.getByRole('button', { name: 'Conectar a Claude Code' }).click();
  await p.locator('.conectar pre').waitFor({ timeout: 4000 });
  const config = await p.locator('.conectar pre').innerText();
  comprobar('«Conectar» muestra la configuración con el hook, el nombre del agente y los eventos', config.includes('hook.mjs') && config.includes(NOMBRE) && config.includes('"Stop"') && config.includes('"UserPromptSubmit"') && config.includes('"command": "node"'));
  comprobar('la configuración no contiene la clave secreta', !/[0-9a-f]{64}/.test(config));
  await p.screenshot({ path: 'capturas/claude-conectar.png' });
  await p.getByRole('button', { name: 'Cerrar', exact: true }).click();

  await aviso({ hook_event_name: 'SessionStart', source: 'startup' });
  await aviso({ hook_event_name: 'UserPromptSubmit', prompt: 'Revisa el presupuesto de la obra de Albacete', prompt_id: 'p1' });
  await aviso({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test --token=SECRETO' } });
  await esperar(600);
  const t1 = await ficha().innerText();
  comprobar('al llegar avisos pasa a «En directo»', t1.includes('En directo'));
  comprobar('el estado es «Trabajando»', t1.includes('Trabajando'));
  comprobar('aparece su tarea «Revisa el presupuesto…» en curso', t1.includes('Revisa el presupuesto de la obra de Albacete') && t1.includes('En curso'));
  comprobar('la actividad dice «Ejecuta npm» y no enseña el secreto', t1.includes('Ejecuta npm') && !t1.includes('SECRETO'));
  await p.screenshot({ path: 'capturas/claude-en-directo.png' });

  await aviso({ hook_event_name: 'Stop' });
  await esperar(500);
  const t2 = await ficha().innerText();
  comprobar('al terminar: «Tarea completada» y la tarea «Hecha»', t2.includes('Tarea completada') && t2.includes('Hecha'));
  await esperar(3500);
  comprobar('a los 3 s vuelve a «Esperando»', (await ficha().innerText()).includes('Esperando'));

  await aviso({ hook_event_name: 'SessionEnd' });
  await esperar(500);
  comprobar('al cerrar la sesión vuelve a «Sin señal»', (await ficha().innerText()).includes('Sin señal'));

  await abrir();
  comprobar('tras recargar sigue siendo un agente real', (await p.locator('.marca').innerText()).includes('+ 1 real'));
  comprobar('sin errores en la consola', errores.length === 0, errores.slice(0, 3).join(' | '));
  await nav.close();
} catch (e) { comprobar('el script terminó sin excepción', false, String(e)); }
finally { servidor.kill(); }
const fallos = resultados.filter((r) => !r).length;
console.log(fallos ? `\n${fallos} comprobación(es) con fallo` : `\nTodo correcto (${resultados.length} comprobaciones)`);
process.exit(fallos ? 1 : 0);
