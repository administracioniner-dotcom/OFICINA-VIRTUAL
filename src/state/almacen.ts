import { esReal, type Agente, type EstadoAgente, type PuestoAsignable } from '../domain/agentes';
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
  /** Solo para agentes reales: si dan señal y cuándo fue la última. */
  conexion: Record<string, { conectado: boolean; ultimaSenal: number | null }>;
  seleccion: Seleccion;
}

export interface Almacen {
  getState(): EstadoAlmacen;
  subscribe(fn: () => void): () => void;
  seleccionar(s: Seleccion): void;
  dispose(): void;
}

const MAX_ACTIVIDAD = 60;
const MAX_HECHAS = 3;
const MAX_TAREAS_REALES = 8;

/** Deja solo las últimas tareas hechas, para que la lista no crezca sin límite. */
const recortarHechas = (tareas: Tarea[]): Tarea[] => {
  const hechas = tareas.filter((t) => t.estado === 'hecha');
  if (hechas.length <= MAX_HECHAS) return tareas;
  const quitar = new Set(hechas.slice(0, hechas.length - MAX_HECHAS).map((t) => t.id));
  return tareas.filter((t) => !quitar.has(t.id));
};

/**
 * Almacén en memoria: escucha los eventos de la fuente de agentes y es la única fuente de verdad
 * para la interfaz (agentes, tareas, actividad y selección). Cada cambio crea un estado nuevo.
 */
export function crearAlmacen(fuente: AgentSource, puestos: readonly PuestoAsignable[], reloj: () => number = () => Date.now()): Almacen {
  let estado: EstadoAlmacen = {
    agentes: {}, ordenAgentes: [], tareas: {}, actividad: [],
    puestos: Object.fromEntries(puestos.map((p) => [p.id, p])), conexion: {}, seleccion: null,
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
      const real = esReal(a);
      let tareas: Tarea[] = [];
      if (!real) { tareas = generarTareas(a, 1); if (a.estado === 'trabajando') tareas = trabajar(tareas); }
      const { [a.id]: _c, ...sinConexion } = estado.conexion;
      cambiar({
        ...estado,
        agentes: { ...estado.agentes, [a.id]: a },
        ordenAgentes: estado.ordenAgentes.includes(a.id) ? estado.ordenAgentes : [...estado.ordenAgentes, a.id],
        tareas: { ...estado.tareas, [a.id]: tareas },
        conexion: real ? { ...estado.conexion, [a.id]: { conectado: false, ultimaSenal: null } } : sinConexion,
      });
      return;
    }
    if (ev.tipo === 'agente.baja') {
      if (!estado.agentes[ev.id]) return;
      const { [ev.id]: _a, ...agentes } = estado.agentes;
      const { [ev.id]: _t, ...tareas } = estado.tareas;
      const { [ev.id]: _c, ...conexion } = estado.conexion;
      contadorTareas.delete(ev.id);
      const sel = estado.seleccion;
      cambiar({
        ...estado, agentes, tareas, conexion,
        ordenAgentes: estado.ordenAgentes.filter((x) => x !== ev.id),
        actividad: estado.actividad.filter((x) => x.agenteId !== ev.id),
        seleccion: sel && sel.tipo === 'agente' && sel.id === ev.id ? null : sel,
      });
      return;
    }
    if (ev.tipo === 'agente.cambio') {
      const a = ev.agente;
      const previo = estado.agentes[a.id];
      if (!previo) return;
      let tareas = estado.tareas[a.id] ?? [];
      if (previo.departamento !== a.departamento) {
        contadorTareas.set(a.id, 4);
        tareas = generarTareas(a, 1);
        if (a.estado === 'trabajando') tareas = trabajar(tareas);
      }
      cambiar({ ...estado, agentes: { ...estado.agentes, [a.id]: a }, tareas: { ...estado.tareas, [a.id]: tareas } });
      return;
    }
    const agente = estado.agentes[ev.id];
    if (!agente) return;
    // los avisos de un agente real cuentan como señal suya
    const conSenal = (e: EstadoAlmacen): EstadoAlmacen => (esReal(agente)
      ? { ...e, conexion: { ...e.conexion, [ev.id]: { conectado: true, ultimaSenal: reloj() } } }
      : e);
    if (ev.tipo === 'agente.tarea') {
      const previas = estado.tareas[ev.id] ?? [];
      const nueva: Tarea = { id: ev.tarea.id, agenteId: ev.id, titulo: ev.tarea.titulo, estado: ev.tarea.estado };
      const existe = previas.some((t) => t.id === nueva.id);
      const tareas = (existe ? previas.map((t) => (t.id === nueva.id ? nueva : t)) : [...previas, nueva]).slice(-MAX_TAREAS_REALES);
      cambiar(conSenal({ ...estado, tareas: { ...estado.tareas, [ev.id]: tareas } }));
      return;
    }
    if (ev.tipo === 'agente.actividad') {
      cambiar(conSenal(anotar(estado, ev.id, ev.texto)));
      return;
    }
    if (ev.tipo === 'agente.conexion') {
      if (!esReal(agente)) return;
      const previa = estado.conexion[ev.id];
      cambiar({ ...estado, conexion: { ...estado.conexion, [ev.id]: { conectado: ev.conectado, ultimaSenal: ev.conectado ? reloj() : previa?.ultimaSenal ?? null } } });
      return;
    }
    if (ev.tipo === 'agente.estado') {
      let tareas = estado.tareas[ev.id] ?? [];
      if (esReal(agente)) {
        // las tareas de un agente real las marcan los avisos de Claude Code
      } else if (ev.estado === 'completada') {
        tareas = tareas.map((t) => (t.estado === 'en_curso' ? { ...t, estado: 'hecha' as const } : t));
        if (tareas.every((t) => t.estado === 'hecha')) {
          const desde = contadorTareas.get(ev.id) ?? 4;
          contadorTareas.set(ev.id, desde + 3);
          tareas = [...tareas, ...generarTareas(agente, desde)];
        }
        tareas = recortarHechas(tareas);
      } else if (ev.estado === 'trabajando') {
        tareas = trabajar(tareas);
      }
      const nuevo: EstadoAlmacen = {
        ...estado,
        agentes: { ...estado.agentes, [ev.id]: { ...agente, estado: ev.estado as EstadoAgente } },
        tareas: { ...estado.tareas, [ev.id]: tareas },
      };
      cambiar(conSenal(anotar(nuevo, ev.id, `Estado: ${NOMBRE_ESTADO[ev.estado]}`)));
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
