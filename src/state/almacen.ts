import type { Agente, EstadoAgente, PuestoAsignable } from '../domain/agentes';
import { generarTareas, type Tarea } from '../domain/tareas';
import { NOMBRE_ESTADO } from '../game/sprites/globos';
import type { AgentSource, EventoOficina } from '../source/tipos';

export interface Actividad { id: number; agenteId: string; texto: string; t: number }
export type Seleccion = { tipo: 'agente'; id: string } | { tipo: 'puesto'; id: string } | null;

export interface EstadoAlmacen {
  agentes: Record<string, Agente>;
  ordenAgentes: string[];
  tareas: Record<string, Tarea[]>;
  /** Lo más reciente primero, como máximo 60 anotaciones. */
  actividad: Actividad[];
  puestos: Record<string, PuestoAsignable>;
  seleccion: Seleccion;
}

export interface Almacen {
  getState(): EstadoAlmacen;
  subscribe(fn: () => void): () => void;
  seleccionar(s: Seleccion): void;
  dispose(): void;
}

const MAX_ACTIVIDAD = 60;

/**
 * Almacén en memoria: escucha los eventos de la fuente de agentes y es la única fuente de verdad
 * para la interfaz (agentes, tareas, actividad y selección). Cada cambio crea un estado nuevo.
 */
export function crearAlmacen(fuente: AgentSource, puestos: readonly PuestoAsignable[], reloj: () => number = () => Date.now()): Almacen {
  let estado: EstadoAlmacen = {
    agentes: {}, ordenAgentes: [], tareas: {}, actividad: [],
    puestos: Object.fromEntries(puestos.map((p) => [p.id, p])), seleccion: null,
  };
  const oyentes = new Set<() => void>();
  let siguienteActividad = 1;
  const contadorTareas = new Map<string, number>();

  const cambiar = (nuevo: EstadoAlmacen) => { estado = nuevo; oyentes.forEach((f) => f()); };

  const anotar = (e: EstadoAlmacen, agenteId: string, texto: string): EstadoAlmacen => ({
    ...e,
    actividad: [{ id: siguienteActividad++, agenteId, texto, t: reloj() }, ...e.actividad].slice(0, MAX_ACTIVIDAD),
  });

  /** Pone en curso la primera tarea pendiente si el agente trabaja y no tiene ninguna en curso. */
  const trabajar = (tareas: Tarea[]): Tarea[] => {
    if (tareas.some((t) => t.estado === 'en_curso')) return tareas;
    const i = tareas.findIndex((t) => t.estado === 'pendiente');
    return i < 0 ? tareas : tareas.map((t, k) => (k === i ? { ...t, estado: 'en_curso' as const } : t));
  };

  const alRecibir = (ev: EventoOficina) => {
    if (ev.tipo === 'agente.alta') {
      const a = ev.agente;
      contadorTareas.set(a.id, 4);
      let tareas = generarTareas(a, 1);
      if (a.estado === 'trabajando') tareas = trabajar(tareas);
      cambiar({
        ...estado,
        agentes: { ...estado.agentes, [a.id]: a },
        ordenAgentes: estado.ordenAgentes.includes(a.id) ? estado.ordenAgentes : [...estado.ordenAgentes, a.id],
        tareas: { ...estado.tareas, [a.id]: tareas },
      });
      return;
    }
    const agente = estado.agentes[ev.id];
    if (!agente) return;
    if (ev.tipo === 'agente.estado') {
      let tareas = estado.tareas[ev.id] ?? [];
      if (ev.estado === 'completada') {
        tareas = tareas.map((t) => (t.estado === 'en_curso' ? { ...t, estado: 'hecha' as const } : t));
        if (tareas.every((t) => t.estado === 'hecha')) {
          const desde = contadorTareas.get(ev.id) ?? 4;
          contadorTareas.set(ev.id, desde + 3);
          tareas = [...tareas, ...generarTareas(agente, desde)];
        }
      } else if (ev.estado === 'trabajando') {
        tareas = trabajar(tareas);
      }
      const nuevo: EstadoAlmacen = {
        ...estado,
        agentes: { ...estado.agentes, [ev.id]: { ...agente, estado: ev.estado as EstadoAgente } },
        tareas: { ...estado.tareas, [ev.id]: tareas },
      };
      cambiar(anotar(nuevo, ev.id, `Estado: ${NOMBRE_ESTADO[ev.estado]}`));
      return;
    }
    if (ev.tipo === 'agente.reunion') {
      cambiar(anotar(estado, ev.id, ev.asiento ? 'Va a la sala de reuniones' : 'Sale de la sala de reuniones y vuelve a su puesto'));
    }
  };

  const quitar = fuente.suscribir(alRecibir);

  return {
    getState: () => estado,
    subscribe(fn) { oyentes.add(fn); return () => { oyentes.delete(fn); }; },
    seleccionar(s) {
      if (s) {
        const existe = s.tipo === 'agente' ? !!estado.agentes[s.id] : !!estado.puestos[s.id];
        if (!existe) return;
      }
      const igual = (s === null && estado.seleccion === null) || (s && estado.seleccion && s.tipo === estado.seleccion.tipo && s.id === estado.seleccion.id);
      if (igual) return;
      cambiar({ ...estado, seleccion: s });
    },
    dispose() { quitar(); oyentes.clear(); },
  };
}
