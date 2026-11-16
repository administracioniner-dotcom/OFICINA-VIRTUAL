import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asegurarClave, crearManejador } from './servidor';
import type { AvisoOficina, PuenteLike } from './tipos';

const CLAVE = 'a'.repeat(64);

class PuenteFalso implements PuenteLike {
  recibidos: unknown[] = [];
  oyentes = new Set<(a: AvisoOficina) => void>();
  recibir(c: unknown) { this.recibidos.push(c); }
  suscribir(fn: (a: AvisoOficina) => void) { this.oyentes.add(fn); return () => { this.oyentes.delete(fn); }; }
  instantanea(): AvisoOficina[] { return [{ tipo: 'estado', agente: 'Ana', estado: 'trabajando', t: 1 }]; }
  emitir(a: AvisoOficina) { this.oyentes.forEach((f) => f(a)); }
}

let servidor: http.Server, puerto: number, puente: PuenteFalso;
beforeEach(async () => {
  puente = new PuenteFalso();
  servidor = http.createServer();
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  puerto = (servidor.address() as AddressInfo).port;
  const manejador = crearManejador({ clave: CLAVE, puerto, puente, rutaHook: 'C:\\oficina\\puente\\hook.mjs' });
  servidor.on('request', (req, res) => manejador(req, res, () => { res.statusCode = 404; res.end('otro'); }));
});
afterEach(async () => { servidor.closeAllConnections(); await new Promise((r) => servidor.close(r)); });

const url = (ruta: string) => `http://127.0.0.1:${puerto}${ruta}`;
const aviso = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  fetch(url('/api/oficina/aviso'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-oficina-clave': CLAVE, ...cabeceras }, body: JSON.stringify(cuerpo) });

describe('POST /api/oficina/aviso', () => {
  it('con la clave correcta entrega el aviso al puente y responde 204', async () => {
    const r = await aviso({ hook_event_name: 'Stop', agente: 'Ana' });
    expect(r.status).toBe(204);
    expect(puente.recibidos).toEqual([{ hook_event_name: 'Stop', agente: 'Ana' }]);
  });
  it('sin clave o con clave equivocada: 401 y no llega nada', async () => {
    expect((await fetch(url('/api/oficina/aviso'), { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await aviso({}, { 'x-oficina-clave': 'b'.repeat(64) })).status).toBe(401);
    expect(puente.recibidos).toEqual([]);
  });
  it('un Host que no es el de la oficina (ataque por cambio de DNS) se rechaza con 403', async () => {
    const r = await new Promise<number>((resolve) => {
      const req = http.request({ host: '127.0.0.1', port: puerto, path: '/api/oficina/aviso', method: 'POST', headers: { host: 'malo.example.com', 'x-oficina-clave': CLAVE, 'content-type': 'application/json' } }, (res) => resolve(res.statusCode!));
      req.end('{}');
    });
    expect(r).toBe(403);
    expect(puente.recibidos).toEqual([]);
  });
  it('rechaza cuerpos que no son JSON (400) o demasiado grandes (413)', async () => {
    const mal = await fetch(url('/api/oficina/aviso'), { method: 'POST', headers: { 'x-oficina-clave': CLAVE }, body: 'no es json' });
    expect(mal.status).toBe(400);
    const grande = await fetch(url('/api/oficina/aviso'), { method: 'POST', headers: { 'x-oficina-clave': CLAVE }, body: JSON.stringify({ x: 'y'.repeat(200_000) }) });
    expect(grande.status).toBe(413);
    expect(puente.recibidos).toEqual([]);
  });
  it('otros métodos: 405', async () => {
    expect((await fetch(url('/api/oficina/aviso'), { headers: { 'x-oficina-clave': CLAVE } })).status).toBe(405);
  });
});

describe('GET /api/oficina/flujo (SSE para la página)', () => {
  it('desde la propia página (Sec-Fetch-Site: same-origin) manda la instantánea y los avisos nuevos', async () => {
    const ctl = new AbortController();
    const r = await fetch(url('/api/oficina/flujo'), { headers: { 'sec-fetch-site': 'same-origin' }, signal: ctl.signal });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/event-stream');
    const lector = r.body!.getReader();
    const dec = new TextDecoder();
    let texto = '';
    const leerHasta = async (trozo: string) => { while (!texto.includes(trozo)) { const { value, done } = await lector.read(); if (done) break; texto += dec.decode(value); } };
    await leerHasta('trabajando');
    expect(texto).toContain('event: instantanea');
    puente.emitir({ tipo: 'estado', agente: 'Ana', estado: 'error', t: 2 });
    await leerHasta('"error"');
    expect(texto).toContain('event: aviso');
    ctl.abort();
  });
  it('una página de otro sitio (Sec-Fetch-Site: cross-site) no puede escuchar: 403', async () => {
    expect((await fetch(url('/api/oficina/flujo'), { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403);
  });
  it('sin Sec-Fetch-Site solo vale con la clave (herramientas fuera del navegador)', async () => {
    expect((await fetch(url('/api/oficina/flujo'))).status).toBe(403);
    const ctl = new AbortController();
    const r = await fetch(url('/api/oficina/flujo'), { headers: { 'x-oficina-clave': CLAVE }, signal: ctl.signal });
    expect(r.status).toBe(200);
    ctl.abort();
  });
  it('al cerrarse la conexión se quita la suscripción', async () => {
    const ctl = new AbortController();
    await fetch(url('/api/oficina/flujo'), { headers: { 'sec-fetch-site': 'same-origin' }, signal: ctl.signal });
    expect(puente.oyentes.size).toBe(1);
    ctl.abort();
    await new Promise((r) => setTimeout(r, 100));
    expect(puente.oyentes.size).toBe(0);
  });
});

describe('GET /api/oficina/configuracion', () => {
  it('devuelve la configuración de hooks lista para pegar, con la ruta del hook y el nombre del agente', async () => {
    const r = await fetch(url('/api/oficina/configuracion?agente=' + encodeURIComponent('Lucía "la jefa"')), { headers: { 'sec-fetch-site': 'same-origin' } });
    expect(r.status).toBe(200);
    const j = await r.json() as { configuracion: { hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string; args: string[]; timeout: number }> }>> }; ruta: string };
    expect(j.ruta).toBe('C:\\oficina\\puente\\hook.mjs');
    const h = j.configuracion.hooks['Stop']![0]!.hooks[0]!;
    // Forma sin shell: cada argumento va aparte, así no hay problemas de comillas en Windows.
    expect(h.type).toBe('command');
    expect(h.command).toBe('node');
    expect(h.args).toEqual(['C:\\oficina\\puente\\hook.mjs', '--agente', 'Lucía "la jefa"', '--puerto', String(puerto)]);
    expect(h.timeout).toBeLessThanOrEqual(10);
    expect(Object.keys(j.configuracion.hooks)).toEqual(expect.arrayContaining(['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SessionStart', 'SessionEnd']));
    expect(JSON.stringify(j)).not.toContain(CLAVE);
  });
  it('sin nombre de agente: 400; desde otro sitio: 403', async () => {
    expect((await fetch(url('/api/oficina/configuracion'), { headers: { 'sec-fetch-site': 'same-origin' } })).status).toBe(400);
    expect((await fetch(url('/api/oficina/configuracion?agente=x'), { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403);
  });
});

describe('otras rutas', () => {
  it('lo que no es de la oficina pasa al siguiente manejador', async () => {
    expect(await (await fetch(url('/otra-cosa'))).text()).toBe('otro');
  });
});

describe('asegurarClave', () => {
  it('crea una clave de 64 caracteres hexadecimales la primera vez y devuelve la misma después', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oficina-'));
    const a = asegurarClave(dir);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(asegurarClave(dir)).toBe(a);
    expect(readFileSync(join(dir, 'clave'), 'utf8').trim()).toBe(a);
    expect(statSync(join(dir, 'clave')).isFile()).toBe(true);
  });
});
