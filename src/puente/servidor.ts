import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { PuenteLike } from './tipos';

const MAX_CUERPO = 100_000;
const EVENTOS = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'Notification', 'Stop', 'StopFailure', 'SessionEnd',
];
const CON_FILTRO = new Set(['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Notification']);

/** Lee la clave de `<dir>/clave`; si no existe la crea (64 hex, solo legible por el usuario). */
export function asegurarClave(dir: string): string {
  const ruta = join(dir, 'clave');
  if (existsSync(ruta)) {
    const c = readFileSync(ruta, 'utf8').trim();
    if (/^[0-9a-f]{64}$/.test(c)) return c;
  }
  mkdirSync(dir, { recursive: true });
  const nueva = randomBytes(32).toString('hex');
  writeFileSync(ruta, nueva + '\n', { mode: 0o600 });
  return nueva;
}

export interface OpcionesManejador {
  clave: string;
  puerto: number;
  puente: PuenteLike;
  /** Ruta absoluta de puente/hook.mjs en este ordenador. */
  rutaHook: string;
}

const iguales = (a: string, b: string) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
};

export function crearManejador(o: OpcionesManejador) {
  const hostsValidos = new Set([`127.0.0.1:${o.puerto}`, `localhost:${o.puerto}`]);
  const claveValida = (req: IncomingMessage) => {
    const c = req.headers['x-oficina-clave'];
    return typeof c === 'string' && iguales(c, o.clave);
  };
  // Desde el navegador solo vale la propia página; fuera del navegador (sin Sec-Fetch-Site), con la clave.
  const esLaPagina = (req: IncomingMessage) => {
    const s = req.headers['sec-fetch-site'];
    return s === undefined ? claveValida(req) : s === 'same-origin';
  };
  const responder = (res: ServerResponse, codigo: number, cuerpo?: unknown) => {
    if (cuerpo === undefined) { res.statusCode = codigo; res.end(); return; }
    res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(cuerpo));
  };

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/oficina/')) return next();
    // Evita que una web externa que apunte su DNS a 127.0.0.1 hable con la oficina.
    if (!hostsValidos.has(String(req.headers.host ?? ''))) return responder(res, 403);

    if (url.pathname === '/api/oficina/aviso') {
      if (req.method !== 'POST') return responder(res, 405);
      if (!claveValida(req)) { req.resume(); return responder(res, 401); }
      const trozos: Buffer[] = [];
      let total = 0, demasiado = false;
      req.on('data', (t: Buffer) => {
        total += t.length;
        if (total > MAX_CUERPO) { demasiado = true; return; }
        trozos.push(t);
      });
      req.on('end', () => {
        if (demasiado) return responder(res, 413);
        let json: unknown;
        try { json = JSON.parse(Buffer.concat(trozos).toString('utf8')); } catch { return responder(res, 400); }
        try { o.puente.recibir(json); } catch { /* un aviso raro nunca tumba el servidor */ }
        responder(res, 204);
      });
      return;
    }

    if (url.pathname === '/api/oficina/flujo') {
      if (req.method !== 'GET') return responder(res, 405);
      if (!esLaPagina(req)) return responder(res, 403);
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
      const enviar = (evento: string, datos: unknown) => res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
      enviar('instantanea', o.puente.instantanea());
      const baja = o.puente.suscribir((a) => enviar('aviso', a));
      const latido = setInterval(() => res.write(': latido\n\n'), 15_000);
      latido.unref();
      req.on('close', () => { clearInterval(latido); baja(); });
      return;
    }

    if (url.pathname === '/api/oficina/configuracion') {
      if (req.method !== 'GET') return responder(res, 405);
      if (!esLaPagina(req)) return responder(res, 403);
      const agente = (url.searchParams.get('agente') ?? '').trim();
      if (!agente || agente.length > 60) return responder(res, 400, { error: 'Falta el nombre del agente.' });
      const hooks: Record<string, unknown[]> = {};
      for (const ev of EVENTOS) {
        const gancho = { type: 'command', command: 'node', args: [o.rutaHook, '--agente', agente, '--puerto', String(o.puerto)], timeout: 5 };
        hooks[ev] = [CON_FILTRO.has(ev) ? { matcher: '*', hooks: [gancho] } : { hooks: [gancho] }];
      }
      return responder(res, 200, { configuracion: { hooks }, ruta: o.rutaHook });
    }

    responder(res, 404);
  };
}
