// Verifica en un navegador real: crear, recargar (se guarda), editar y quitar un agente.
// Uso: npm run build && node scripts/verificar-mis-agentes.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
mkdirSync('capturas', { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4178', '--strictPort'], { stdio: 'ignore' });
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => { resultados.push(ok); console.log(`${ok ? 'OK ' : 'FALLA'}  ${nombre}${detalle ? ' — ' + detalle : ''}`); };
try {
  await esperar(2500);
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1480, height: 800 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  const abrir = async () => { await p.goto('http://localhost:4178/?depurar'); await esperar(1500); };
  const contador = () => p.locator('.mis-agentes .contador').innerText();
  const actores = async () => (await p.evaluate(() => window.__oficina())).actores;

  await abrir();
  comprobar('al empezar hay 9 agentes y 5 puestos libres', (await contador()).includes('9 agentes') && (await contador()).includes('5 puestos libres'), await contador());

  await p.getByRole('button', { name: /Nuevo agente/ }).click();
  comprobar('se abre el formulario', (await p.getByRole('dialog').count()) === 1);
  await p.getByRole('button', { name: 'Guardar' }).click();
  comprobar('sin nombre da un error claro', (await p.getByRole('alert').innerText()).includes('nombre'));
  await p.getByLabel('Nombre').fill('Agente CAE 1');
  await p.getByRole('button', { name: 'Guardar' }).click();
  comprobar('un nombre repetido da error', (await p.getByRole('alert').innerText()).toLowerCase().includes('ya existe'));
  await p.getByLabel('Nombre').fill('Sofía');
  await p.getByText('Chico').click();
  await p.getByRole('button', { name: 'Aspecto 4' }).click();
  await p.screenshot({ path: 'capturas/mis-agentes-formulario.png' });
  await p.getByRole('button', { name: 'Guardar' }).click();
  await esperar(500);
  comprobar('al guardar se cierra el formulario', (await p.getByRole('dialog').count()) === 0);
  comprobar('ahora hay 10 agentes y 4 puestos libres', (await contador()).includes('10 agentes') && (await contador()).includes('4 puestos libres'), await contador());
  comprobar('el personaje aparece en la oficina', (await actores()).length === 10);

  await abrir();
  comprobar('tras recargar la página, el agente sigue ahí (se guardó)', (await contador()).includes('10 agentes') && (await actores()).length === 10, await contador());

  // seleccionar al nuevo (es el único cuyo id no es de los iniciales) y editarlo
  const s = await p.evaluate(() => window.__oficina());
  const nuevo = s.actores.find((a) => !['direccion-1','ingenieria-1','ingenieria-2','compras-1','recepcion-1','desarrollo-1','marketing-1','cae-1','admin-1'].includes(a.id));
  await p.getByRole('button', { name: 'Compras' }).click(); // mueve la cámara; luego se centra en el puesto del nuevo
  await esperar(300);
  await p.evaluate((id) => document.dispatchEvent(new CustomEvent('x', { detail: id })), nuevo.id);
  // selección real por clic: se acerca la cámara a su zona y se pulsa sobre él
  await p.getByRole('button', { name: nuevo.id.startsWith('direccion') ? 'Dirección' : 'Ingeniería' }).click();
  await esperar(1000);
  const s2 = await p.evaluate(() => window.__oficina());
  const a2 = s2.actores.find((a) => a.id === nuevo.id);
  await p.mouse.click((a2.x - s2.aPantalla.x) * s2.aPantalla.zoom, (a2.y - 10 - s2.aPantalla.y) * s2.aPantalla.zoom);
  await esperar(400);
  comprobar('clic en el agente nuevo abre su ficha con su nombre', (await p.locator('aside.ficha').innerText()).includes('Sofía'));
  await p.getByRole('button', { name: 'Editar' }).click();
  await p.getByLabel('Nombre').fill('Sofía Ruiz');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await esperar(500);
  comprobar('editar cambia el nombre en la ficha', (await p.locator('aside.ficha').innerText()).includes('Sofía Ruiz'));
  await p.screenshot({ path: 'capturas/mis-agentes-ficha.png' });

  await p.getByRole('button', { name: 'Quitar' }).click();
  comprobar('quitar pide confirmación', (await p.getByRole('alertdialog').count()) === 1);
  await p.getByRole('button', { name: 'Sí, quitar' }).click();
  await esperar(500);
  comprobar('tras confirmar, el agente desaparece y vuelve a haber 9', (await contador()).includes('9 agentes') && (await actores()).length === 9, await contador());
  await abrir();
  comprobar('y tras recargar sigue sin estar', (await contador()).includes('9 agentes') && (await actores()).length === 9);
  comprobar('sin errores de consola', errores.length === 0, JSON.stringify(errores));
  await nav.close();
  process.exitCode = resultados.every(Boolean) ? 0 : 1;
} finally { servidor.kill(); }
