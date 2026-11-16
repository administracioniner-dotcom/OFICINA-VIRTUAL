// Capturas y comprobaciones con Playwright (preinstalado en el entorno; no es dependencia del proyecto).
// Uso: npm run build && node scripts/captura.mjs [prefijo]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const prefijo = process.argv[2] ?? 'captura';
const PUERTO = 4173;
const URL = `http://localhost:${PUERTO}/`;
mkdirSync('capturas', { recursive: true });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const servidor = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { stdio: 'ignore' });
const errores = [];
const nuevaPagina = async (navegador, opciones) => {
  const pagina = await navegador.newPage(opciones);
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await pagina.goto(URL);
  await esperar(1500);
  return pagina;
};

try {
  await esperar(2500);
  const navegador = await chromium.launch();
  const pagina = await nuevaPagina(navegador, { viewport: { width: 1480, height: 800 } });
  const foto = (nombre) => pagina.screenshot({ path: `capturas/${prefijo}-${nombre}.png` });

  await foto('mapa');
  const antes = await pagina.screenshot();
  await pagina.mouse.move(700, 400); await pagina.mouse.down();
  await pagina.mouse.move(702, 401); await pagina.mouse.up();
  await esperar(200);
  const despues = await pagina.screenshot();
  console.log('un temblor de 2 px NO mueve la cámara:', antes.equals(despues));

  await pagina.getByRole('button', { name: 'Dirección' }).click();
  await esperar(900); await foto('direccion');
  await pagina.getByRole('button', { name: 'Desarrollo' }).click();
  await esperar(900); await foto('isla');
  await pagina.getByRole('button', { name: 'Descanso' }).click();
  await esperar(900); await foto('descanso');
  await pagina.getByRole('button', { name: 'Ingeniería' }).click();
  await esperar(900); await foto('ingenieria');

  await pagina.getByRole('button', { name: 'Alejar' }).click();
  await esperar(300);
  await pagina.getByRole('button', { name: 'Acercar' }).click();
  await esperar(300);
  await pagina.mouse.move(700, 400); await pagina.mouse.down();
  await pagina.mouse.move(500, 300, { steps: 10 }); await pagina.mouse.up();
  await foto('arrastrado');

  // Fotogramas por segundo: en reposo y moviendo la cámara con el teclado (sin ruido de ratón)
  const medir = async (ms) => {
    await pagina.evaluate(() => { window.__fps = { n: 0, t0: performance.now() }; const f = () => { window.__fps.n++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await esperar(ms);
    return pagina.evaluate(() => (window.__fps.n * 1000) / (performance.now() - window.__fps.t0));
  };
  await pagina.getByRole('button', { name: 'Acercar' }).click();
  await pagina.getByRole('button', { name: 'Acercar' }).click();
  await pagina.mouse.move(700, 400);
  console.log('fps en reposo (Chromium de pruebas, sin GPU):', (await medir(3000)).toFixed(1));
  await pagina.keyboard.down('d');
  console.log('fps moviendo la cámara con el teclado:', (await medir(2000)).toFixed(1));
  await pagina.keyboard.up('d');
  await pagina.close();

  const hd = await nuevaPagina(navegador, { viewport: { width: 1000, height: 600 }, deviceScaleFactor: 2 });
  await hd.getByRole('button', { name: 'Acercar' }).click();
  await esperar(400);
  await hd.screenshot({ path: `capturas/${prefijo}-hd.png` });

  const chica = await nuevaPagina(navegador, { viewport: { width: 400, height: 700 } });
  await chica.screenshot({ path: `capturas/${prefijo}-movil.png` });

  console.log('errores de consola:', JSON.stringify(errores));
  await navegador.close();
} finally {
  servidor.kill();
}
