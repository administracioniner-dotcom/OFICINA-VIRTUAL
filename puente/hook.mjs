#!/usr/bin/env node
// Aviso de Claude Code → oficina virtual. Lo llaman los hooks de Claude Code (ver docs/conectar-claude-code.md).
// Reglas: siempre termina con código 0 y en silencio (nunca debe molestar a Claude Code),
// solo habla con 127.0.0.1 y solo envía lo mínimo (no manda respuestas del asistente ni contenido de ficheros).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const salir = () => process.exit(0);
setTimeout(salir, 2500).unref(); // seguro: nunca quedarse colgado

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const recorte = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);

/** Deja solo los campos que la oficina necesita, recortados. */
export function reducir(d, agente) {
  const e = d && typeof d === 'object' ? d : {};
  const ti = e.tool_input && typeof e.tool_input === 'object' ? e.tool_input : {};
  return {
    agente,
    hook_event_name: recorte(e.hook_event_name, 40),
    prompt_id: recorte(e.prompt_id, 80),
    prompt: recorte(e.prompt, 200),
    tool_name: recorte(e.tool_name, 80),
    tool_input: { command: recorte(ti.command, 200), file_path: recorte(ti.file_path, 300), notebook_path: recorte(ti.notebook_path, 300) },
    is_interrupt: e.is_interrupt === true ? true : undefined,
    notification_type: recorte(e.notification_type, 40),
  };
}

async function leerEntrada() {
  const trozos = [];
  for await (const t of process.stdin) trozos.push(t);
  return Buffer.concat(trozos).toString('utf8');
}

async function main() {
  const agente = argumento('agente', '');
  const puerto = Number(argumento('puerto', '5173'));
  if (!agente || !Number.isInteger(puerto)) return;
  let crudo;
  try { crudo = JSON.parse(await leerEntrada()); } catch { return; }
  const clave = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.oficina', 'clave'), 'utf8').trim();
  await fetch(`http://127.0.0.1:${puerto}/api/oficina/aviso`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-oficina-clave': clave },
    body: JSON.stringify(reducir(crudo, agente)),
    signal: AbortSignal.timeout(1500),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => {}).finally(salir);
}
