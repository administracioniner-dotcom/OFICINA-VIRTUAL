// Verifica en un navegador real la selección: clic en agente, clic en escritorio, Esc, clic en vacío y arrastre.
// Uso: npm run build && node scripts/verificar-fichas.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
mkdirSync('capturas', { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', '4176', '--strictPort'], { stdio: 'ignore' });
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => { resultados.push({ nombre, ok }); console.log(`${ok ? 'OK ' : 'FALLA'}  ${nombre}${detalle ? ' — ' + detalle : ''}`); };
try {
  await esperar(2500);
  const nav = await chromium.launch();
  const p = await nav.newPage({ viewport: { width: 1480, height: 800 } });
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await p.goto('http://localhost:4176/?depurar');
  await esperar(1500);
  const estado = () => p.evaluate(() => window.__oficina());
  const pantalla = (s, x, y) => ({ x: (x - s.aPantalla.x) * s.aPantalla.zoom, y: (y - s.aPantalla.y) * s.aPantalla.zoom });
  const ficha = () => p.locator('aside.ficha');

  // acercar para clicar con precisión
  await p.getByRole('button', { name: 'Compras' }).click();
  await esperar(900);
  let s = await estado();
  const compras = s.actores.find((a) => a.id === 'compras-1');
  // 1) clic en un agente sentado
  let pt = pantalla(s, compras.x, compras.y - 10);
  await p.mouse.click(pt.x, pt.y);
  await esperar(300);
  comprobar('clic en un agente abre su ficha', (await ficha().count()) === 1 && (await ficha().innerText()).includes('Agente Compras 1'));
  const texto = await ficha().innerText();
  comprobar('la ficha muestra departamento, estado, puesto, tareas y el aviso de simulación', ['Compras', 'Estado', 'Puesto', 'Tareas asignadas', 'simulado'].every((t) => texto.toLowerCase().includes(t.toLowerCase())));
  await p.screenshot({ path: 'capturas/ficha-agente.png' });
  // 2) Esc cierra
  await p.keyboard.press('Escape'); await esperar(200);
  comprobar('Esc cierra la ficha', (await ficha().count()) === 0);
  // 3) clic en el escritorio (borde izquierdo, lejos del agente)
  s = await estado();
  const pu = s.puestos.find((q) => q.id.startsWith('escritorio-27-3'));
  pt = pantalla(s, pu.x + 6, pu.y + pu.h / 2);
  await p.mouse.click(pt.x, pt.y); await esperar(300);
  comprobar('clic en un escritorio abre la ficha del puesto', (await ficha().count()) === 1 && (await ficha().innerText()).includes('Escritorio de Compras'));
  comprobar('la ficha del puesto dice a quién está asignado', (await ficha().innerText()).includes('Agente Compras 1'));
  await p.screenshot({ path: 'capturas/ficha-puesto.png' });
  // 4) clic en el vacío deselecciona: se busca una baldosa libre, sin agentes ni puestos cerca y fuera de los paneles
  s = await estado();
  let vacio = null;
  for (let sy = 150; sy < 700 && !vacio; sy += 40) {
    for (let sx = 200; sx < 1000 && !vacio; sx += 40) {
      const wx = sx / s.aPantalla.zoom + s.aPantalla.x, wy = sy / s.aPantalla.zoom + s.aPantalla.y;
      const libre = s.bloqueada[Math.floor(wy / 32)]?.[Math.floor(wx / 32)] === false;
      const lejos = s.actores.every((a) => Math.hypot(a.x - wx, a.y - wy) > 60) && s.puestos.every((q) => wx < q.x - 20 || wx > q.x + q.w + 20 || wy < q.y - 20 || wy > q.y + q.h + 20);
      if (libre && lejos) vacio = { x: sx, y: sy };
    }
  }
  comprobar('hay un punto vacío donde hacer clic', !!vacio);
  await p.mouse.click(vacio.x, vacio.y); await esperar(300);
  comprobar('clic en el vacío cierra la ficha', (await ficha().count()) === 0);
  // 5) arrastrar desde un agente no selecciona y mueve la cámara
  s = await estado();
  const c2 = s.actores.find((a) => a.id === 'compras-1');
  pt = pantalla(s, c2.x, c2.y - 10);
  const antes = s.aPantalla.x;
  await p.mouse.move(pt.x, pt.y); await p.mouse.down(); await p.mouse.move(pt.x - 80, pt.y, { steps: 8 }); await p.mouse.up(); await esperar(300);
  const despues = (await estado()).aPantalla.x;
  comprobar('arrastrar desde un agente mueve la cámara y no abre la ficha', Math.abs(despues - antes) > 5 && (await ficha().count()) === 0, `x: ${antes.toFixed(0)} → ${despues.toFixed(0)}`);
  comprobar('sin errores de consola', errores.length === 0, JSON.stringify(errores));
  await nav.close();
  process.exitCode = resultados.every((r) => r.ok) ? 0 : 1;
} finally { servidor.kill(); }
