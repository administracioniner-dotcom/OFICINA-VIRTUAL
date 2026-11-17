// Verifica en un navegador real la conexión del agente CAE con la oficina:
// 1) convierte al agente CAE en «real», 2) ejecuta los hooks de la configuración que genera conectar-oficina.mjs (como haría Claude Code),
// 3) comprueba el estado en vivo y el panel con los datos reales de agente-cae/conocimiento.
// Uso: npm run build && node scripts/verificar-conexion-cae.mjs
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
mkdirSync('capturas', { recursive: true });
const PUERTO = 4181;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { stdio: 'ignore' });
const resultados = [];
const comprobar = (nombre, ok, detalle = '') => { resultados.push(ok); console.log(`${ok ? 'OK ' : 'FALLA'}  ${nombre}${detalle ? ' — ' + detalle : ''}`); };
const lista = (f) => JSON.parse(readFileSync(`agente-cae/conocimiento/${f}`, 'utf8'));
try {
  execFileSync('node', ['agente-cae/conectar-oficina.mjs', 'Agente CAE', String(PUERTO)]);
  const ajustes = JSON.parse(readFileSync('agente-cae/.claude/settings.json', 'utf8'));
  // Lanza el hook EXACTAMENTE como indica la configuración generada (command + args), con el aviso por la entrada estándar
  const lanzar = (evento, extra = {}) => {
    const h = ajustes.hooks[evento][0].hooks[0];
    execFileSync(h.command, h.args, { input: JSON.stringify({ hook_event_name: evento, ...extra }) });
  };
  comprobar('el script crea la configuración con los 9 eventos', Object.keys(ajustes.hooks).length === 9);

  await esperar(3000);
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1480, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await p.goto(`http://localhost:${PUERTO}/?depurar`); await esperar(1500);

  // seleccionar al agente CAE y hacerlo real
  const s = await p.evaluate(() => window.__oficina());
  const cae = s.actores.find((a) => a.id === 'cae-1');
  await p.getByRole('button', { name: 'CAE', exact: true }).click(); await esperar(1000);
  const s2 = await p.evaluate(() => window.__oficina());
  const a2 = s2.actores.find((a) => a.id === cae.id);
  await p.mouse.click((a2.x - s2.aPantalla.x) * s2.aPantalla.zoom, (a2.y - 10 - s2.aPantalla.y) * s2.aPantalla.zoom); await esperar(400);
  const ficha = p.locator('aside.ficha');
  comprobar('se abre la ficha del agente del departamento CAE', (await ficha.count()) === 1);
  comprobar('siendo simulado no enseña el panel CAE', (await p.locator('.panel-cae').count()) === 0);
  await p.getByRole('button', { name: 'Editar' }).click();
  await p.getByLabel('Nombre').fill('Agente CAE');
  await p.getByLabel(/Real: lo mueve/).check();
  await p.getByRole('button', { name: 'Guardar' }).click(); await esperar(600);
  comprobar('ahora es «Real · Claude Code»', (await ficha.innerText()).includes('Real · Claude Code'));
  comprobar('no le quedan tareas ni actividad simuladas', !(await ficha.innerText()).includes('(simulada)') && (await ficha.innerText()).includes('Todavía no ha recibido ninguna orden'));

  // panel con los datos reales de la carpeta agente-cae
  await p.locator('.panel-cae').waitFor({ timeout: 5000 });
  const t = await p.locator('.panel-cae').innerText();
  const fichas = lista('fichas.json'), norma = lista('normativa.json');
  comprobar('el panel muestra las fichas reales', t.includes(String(fichas.length)) && t.includes(`${fichas.filter((f) => f.sector === 'residencial').length} residenciales`) && t.includes(`${fichas.filter((f) => f.sector === 'industrial').length} industriales`), `${fichas.length} fichas`);
  comprobar('el panel muestra la normativa y la última publicación (11/11/2026)', t.includes(`${norma.length}`) && t.includes('11/11/2026'));
  comprobar('el panel muestra la última consulta (17/11/2026) y sin informe aún', t.includes('17/11/2026'));
  comprobar('el panel no enseña fórmulas ni contenido de fichas', !t.includes('AETOTAL') && !t.includes('SCOPdhw'));
  await p.screenshot({ path: 'capturas/cae-panel.png' });

  // hooks tal como los ejecutaría Claude Code
  lanzar('SessionStart', { source: 'startup' });
  lanzar('UserPromptSubmit', { prompt: 'Ejecuta la tarea semanal descrita en tareas\\semanal.md', prompt_id: 'sem1' });
  lanzar('PreToolUse', { tool_name: 'WebFetch', tool_input: { url: 'https://www.boe.es/secreto?token=1' } });
  await esperar(900);
  const t1 = await ficha.innerText();
  comprobar('estado en vivo: «En directo» y «Trabajando»', t1.includes('En directo') && t1.includes('Trabajando'));
  comprobar('la tarea de la ejecución semanal aparece en curso, y es la única', t1.includes('Ejecuta la tarea semanal') && t1.includes('En curso') && !t1.includes('(simulada)') && t1.includes('Tareas asignadas (1 activas)'));
  comprobar('la actividad dice «Consulta la web» sin enseñar la dirección', t1.includes('Consulta la web') && !t1.includes('boe.es') && !t1.includes('secreto'));
  await p.screenshot({ path: 'capturas/cae-en-directo.png' });
  lanzar('Stop');
  await esperar(600);
  comprobar('al terminar: «Tarea completada» y la tarea «Hecha»', (await ficha.innerText()).includes('Tarea completada') && (await ficha.innerText()).includes('Hecha'));
  comprobar('sin errores en la consola', errores.length === 0, errores.slice(0, 3).join(' | '));
  await nav.close();
} catch (e) { comprobar('el script terminó sin excepción', false, String(e)); }
finally { servidor.kill(); }
const fallos = resultados.filter((r) => !r).length;
console.log(fallos ? `\n${fallos} comprobación(es) con fallo` : `\nTodo correcto (${resultados.length} comprobaciones)`);
process.exit(fallos ? 1 : 0);
