import { CONTEXTO_VACIO, traducir, type ContextoAgente } from './traducir';
import type { AvisoOficina, PuenteLike } from './tipos';

const MAX_AGENTES = 50;
const MAX_NOMBRE = 60;
const ESPERA_TRAS_STOP_MS = 3000;

export interface OpcionesNucleo {
  reloj?: () => number;
  /** Programa `fn` dentro de `ms`; devuelve cómo cancelarlo. */
  temporizador?: (fn: () => void, ms: number) => () => void;
}

interface Ultimo {
  conexion?: AvisoOficina; tarea?: AvisoOficina; actividad?: AvisoOficina; estado?: AvisoOficina;
}

/** Recibe avisos crudos de los hooks, los traduce y los reparte. Sin red ni disco: se prueba solo. */
export function crearNucleo(op: OpcionesNucleo = {}): PuenteLike {
  const reloj = op.reloj ?? (() => Date.now());
  const temporizador = op.temporizador ?? ((fn, ms) => { const id = setTimeout(fn, ms); id.unref?.(); return () => clearTimeout(id); });
  const contextos = new Map<string, ContextoAgente>();
  const ultimos = new Map<string, Ultimo>();
  const esperas = new Map<string, () => void>();
  const oyentes = new Set<(a: AvisoOficina) => void>();

  const emitir = (a: AvisoOficina) => {
    const u = ultimos.get(a.agente) ?? {};
    if (a.tipo === 'conexion') u.conexion = a;
    else if (a.tipo === 'estado') u.estado = a;
    else if (a.tipo === 'actividad') u.actividad = a;
    else if (a.tipo === 'tarea') { if (a.tarea.estado === 'en_curso') u.tarea = a; else delete u.tarea; }
    ultimos.set(a.agente, u);
    for (const f of [...oyentes]) { try { f(a); } catch { /* un oyente roto no afecta a los demás */ } }
  };

  return {
    recibir(crudo) {
      if (crudo === null || typeof crudo !== 'object') return;
      const nombre = (crudo as Record<string, unknown>).agente;
      if (typeof nombre !== 'string') return;
      const agente = nombre.trim();
      if (!agente || agente.length > MAX_NOMBRE) return;
      if (!contextos.has(agente) && contextos.size >= MAX_AGENTES) return;

      esperas.get(agente)?.(); esperas.delete(agente);
      const r = traducir(crudo, agente, reloj(), contextos.get(agente) ?? CONTEXTO_VACIO);
      contextos.set(agente, r.contexto);
      r.avisos.forEach(emitir);

      if ((crudo as Record<string, unknown>).hook_event_name === 'SessionEnd') { contextos.delete(agente); ultimos.delete(agente); }
      if ((crudo as Record<string, unknown>).hook_event_name === 'Stop') {
        esperas.set(agente, temporizador(() => {
          esperas.delete(agente);
          emitir({ tipo: 'estado', agente, estado: 'esperando', t: reloj() });
        }, ESPERA_TRAS_STOP_MS));
      }
    },
    suscribir(fn) { oyentes.add(fn); return () => { oyentes.delete(fn); }; },
    instantanea() {
      return [...ultimos.values()].flatMap((u) => [u.conexion, u.tarea, u.actividad, u.estado].filter((x): x is AvisoOficina => !!x));
    },
  };
}
