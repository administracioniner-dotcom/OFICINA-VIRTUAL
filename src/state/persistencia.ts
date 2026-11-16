import type { Agente, PuestoAsignable } from '../domain/agentes';
import { VARIANTES } from '../domain/gestionAgentes';

export const CLAVE_AGENTES = 'iner-oficina-agentes-v1';
const VERSION = 1;

/** Lo mínimo que se usa de `localStorage`. */
export interface Almacenamiento { getItem(clave: string): string | null; setItem(clave: string, valor: string): void }

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Lee la lista de agentes guardada. Si no hay nada, o está corrupta, devuelve `porDefecto`.
 * Descarta los agentes inválidos (puesto inexistente, de reuniones, repetido o con campos mal formados).
 */
export function cargarAgentes(alm: Almacenamiento, porDefecto: Agente[], asientos: readonly PuestoAsignable[]): Agente[] {
  let crudo: string | null;
  try { crudo = alm.getItem(CLAVE_AGENTES); } catch { return porDefecto; }
  if (!crudo) return porDefecto;
  let datos: unknown;
  try { datos = JSON.parse(crudo); } catch { return porDefecto; }
  const lista = (datos as { agentes?: unknown } | null)?.agentes;
  if (!Array.isArray(lista)) return porDefecto;

  const ids = new Set<string>(), puestos = new Set<string>();
  const res: Agente[] = [];
  for (const x of lista) {
    if (!x || typeof x !== 'object') continue;
    const a = x as Record<string, unknown>;
    if (!esTexto(a.id) || !esTexto(a.nombre) || !esTexto(a.departamento) || !esTexto(a.camisa) || !esTexto(a.asientoId)) continue;
    if ((a.genero !== 'f' && a.genero !== 'm') || !Number.isInteger(a.variante)) continue;
    if ((a.variante as number) < 0 || (a.variante as number) >= VARIANTES) continue;
    const asiento = asientos.find((s) => s.id === a.asientoId);
    if (!asiento || !asiento.zona || asiento.tipo === 'reuniones' || ids.has(a.id) || puestos.has(a.asientoId)) continue;
    ids.add(a.id); puestos.add(a.asientoId);
    const real = a.origen === 'real';
    res.push({
      id: a.id, nombre: a.nombre, departamento: asiento.zona, genero: a.genero,
      camisa: a.camisa, variante: a.variante as number, asientoId: a.asientoId,
      estado: real ? 'esperando' : 'trabajando', origen: real ? 'real' : 'simulado',
    });
  }
  return res;
}

/** Guarda la lista. Devuelve false si el navegador no deja (modo privado, almacenamiento lleno). */
export function guardarAgentes(alm: Almacenamiento, agentes: readonly Agente[]): boolean {
  try {
    const guardables = agentes.map(({ estado: _estado, ...resto }) => resto);
    alm.setItem(CLAVE_AGENTES, JSON.stringify({ version: VERSION, agentes: guardables }));
    return true;
  } catch { return false; }
}
