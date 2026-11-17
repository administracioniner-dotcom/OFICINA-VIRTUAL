#!/usr/bin/env node
// Conecta el agente CAE con la oficina virtual: crea (o actualiza) agente-cae/.claude/settings.json con los hooks de Claude Code.
// Uso: node conectar-oficina.mjs ["Nombre del agente"] [puerto]     (por defecto «Agente CAE» y 5173)
// El nombre debe ser el mismo que el del agente REAL en la oficina. Sin dependencias; solo habla con 127.0.0.1 cuando Claude Code avisa.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVENTOS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Notification', 'Stop', 'StopFailure', 'SessionEnd'];
const CON_FILTRO = new Set(['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Notification']);

/** Misma configuración que da la oficina en «Conectar a Claude Code» (una prueba lo comprueba). */
export function configuracionHooks(rutaHook, agente, puerto) {
  const hooks = {};
  for (const ev of EVENTOS) {
    const gancho = { type: 'command', command: 'node', args: [rutaHook, '--agente', agente, '--puerto', String(puerto)], timeout: 5, ...(ev === 'PreToolUse' || ev === 'PostToolUse' ? { async: true } : {}) };
    hooks[ev] = [CON_FILTRO.has(ev) ? { matcher: '*', hooks: [gancho] } : { hooks: [gancho] }];
  }
  return { hooks };
}

const esDeLaOficina = (entrada) => (entrada?.hooks ?? []).some((h) => Array.isArray(h?.args) && h.args.some((a) => typeof a === 'string' && /hook\.mjs$/i.test(a)));

/** Une los hooks de la oficina con los ajustes que ya hubiera, sin duplicarlos ni tocar los demás. */
export function combinar(existente, nueva) {
  const res = { ...existente, hooks: { ...(existente?.hooks ?? {}) } };
  for (const [ev, entradas] of Object.entries(nueva.hooks)) {
    const propias = (res.hooks[ev] ?? []).filter((e) => !esDeLaOficina(e));
    res.hooks[ev] = [...propias, ...entradas];
  }
  return res;
}

export function escribirConfiguracion(carpeta, rutaHook, agente, puerto) {
  const nombre = String(agente ?? '').trim();
  if (!nombre || nombre.length > 60) throw new Error('El nombre del agente no puede estar vacío ni pasar de 60 caracteres.');
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('El puerto no es válido.');
  const fichero = join(carpeta, '.claude', 'settings.json');
  let existente = {};
  if (existsSync(fichero)) {
    try { existente = JSON.parse(readFileSync(fichero, 'utf8')); } catch { throw new Error(`No se pudo leer ${fichero} (no es JSON válido). No se ha cambiado nada.`); }
  }
  const final = combinar(existente, configuracionHooks(rutaHook, nombre, puerto));
  mkdirSync(join(carpeta, '.claude'), { recursive: true });
  writeFileSync(fichero, JSON.stringify(final, null, 2) + '\n');
  return fichero;
}

const esPrincipal = () => { try { return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (esPrincipal()) {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const rutaHook = resolve(aqui, '..', 'puente', 'hook.mjs');
  const nombre = process.argv[2] ?? 'Agente CAE';
  const puerto = Number(process.argv[3] ?? 5173);
  try {
    if (!existsSync(rutaHook)) throw new Error(`No encuentro ${rutaHook}. Esta carpeta debe estar dentro de la carpeta de la oficina.`);
    const f = escribirConfiguracion(aqui, rutaHook, nombre, puerto);
    console.log(`Hecho. Configuración escrita en ${f}\nAgente: «${nombre}» (puerto ${puerto}).\nEn la oficina, el agente real del departamento CAE debe llamarse exactamente «${nombre}».`);
  } catch (e) { console.error(`No se pudo conectar: ${e.message}`); process.exit(1); }
}
