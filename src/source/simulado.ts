import type { Agente, EstadoAgente } from '../domain/agentes';
import type { AgentSource, EventoOficina } from './tipos';

type Azar = () => number;
interface Interno { agente: Agente; estado: EstadoAgente; resta: number; silla: string | null }

const DURACION: Record<EstadoAgente, readonly [number, number]> = {
  trabajando: [6, 14], pensando: [3, 7], esperando: [4, 9], completada: [3, 3], error: [4, 6], en_reunion: [12, 22],
};

/** Elige un elemento según pesos. */
function elegir<T>(opciones: ReadonlyArray<readonly [T, number]>, azar: Azar): T {
  const total = opciones.reduce((s, [, p]) => s + p, 0);
  let x = azar() * total;
  for (const [v, p] of opciones) { if ((x -= p) < 0) return v; }
  return opciones[opciones.length - 1]![0];
}

/**
 * Agentes SIMULADOS: cambian de estado al azar con reglas simples. No hay ningún agente real detrás.
 * El tiempo lo mueve `avanzar(dt)`; `iniciar()` lo conecta a un reloj real.
 */
export class SimuladorAgentes implements AgentSource {
  private readonly oyentes = new Set<(e: EventoOficina) => void>();
  private readonly internos: Interno[];
  private activo = false;
  private temporizador: ReturnType<typeof setInterval> | undefined;
  private ultimo = 0;

  constructor(agentes: readonly Agente[], private readonly sillasReunion: readonly string[], private readonly azar: Azar = Math.random, private readonly escalaTiempo = 1) {
    this.internos = agentes.map((a) => ({ agente: a, estado: a.estado, resta: this.duracion(a.estado), silla: null }));
  }

  suscribir(fn: (e: EventoOficina) => void): () => void {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  }

  iniciar(): void {
    this.activo = true;
    for (const i of this.internos) this.emitir({ tipo: 'agente.alta', agente: { ...i.agente, estado: i.estado } });
    if (typeof setInterval === 'function' && !this.temporizador) {
      this.ultimo = Date.now();
      this.temporizador = setInterval(() => { const ahora = Date.now(); this.avanzar(((ahora - this.ultimo) / 1000) * this.escalaTiempo); this.ultimo = ahora; }, 250);
    }
  }

  detener(): void {
    this.activo = false;
    if (this.temporizador) { clearInterval(this.temporizador); this.temporizador = undefined; }
  }

  /** Añade un agente; si la simulación ya está en marcha, se da de alta en el acto. */
  agregar(agente: Agente): void {
    this.internos.push({ agente, estado: agente.estado, resta: this.duracion(agente.estado), silla: null });
    if (this.activo) this.emitir({ tipo: 'agente.alta', agente: { ...agente, estado: agente.estado } });
  }

  /** Cambia los datos de un agente (conserva su estado actual). */
  actualizar(agente: Agente): void {
    const i = this.internos.find((x) => x.agente.id === agente.id);
    if (!i) return;
    i.agente = agente;
    this.emitir({ tipo: 'agente.cambio', agente: { ...agente, estado: i.estado } });
  }

  /** Quita un agente; si estaba en una reunión, libera su silla antes. */
  quitar(id: string): void {
    const k = this.internos.findIndex((x) => x.agente.id === id);
    if (k < 0) return;
    const i = this.internos[k]!;
    if (i.silla) { i.silla = null; this.emitir({ tipo: 'agente.reunion', id, asiento: null }); }
    this.internos.splice(k, 1);
    this.emitir({ tipo: 'agente.baja', id });
  }

  /** Hace pasar `dt` segundos de simulación. */
  avanzar(dt: number): void {
    if (!this.activo) return;
    for (const i of [...this.internos]) {
      i.resta -= dt;
      if (i.resta <= 0) this.siguiente(i);
    }
  }

  private duracion(e: EstadoAgente): number {
    const [min, max] = DURACION[e];
    return min + this.azar() * (max - min);
  }

  private sillaLibre(): string | null {
    const ocupadas = new Set(this.internos.map((i) => i.silla).filter(Boolean));
    return this.sillasReunion.find((s) => !ocupadas.has(s)) ?? null;
  }

  private siguiente(i: Interno): void {
    let nuevo: EstadoAgente;
    switch (i.estado) {
      case 'trabajando': nuevo = elegir<EstadoAgente>([['pensando', 45], ['completada', 20], ['esperando', 15], ['en_reunion', 15], ['error', 5]], this.azar); break;
      case 'pensando': nuevo = elegir<EstadoAgente>([['trabajando', 85], ['completada', 10], ['error', 5]], this.azar); break;
      case 'esperando': nuevo = elegir<EstadoAgente>([['trabajando', 80], ['en_reunion', 20]], this.azar); break;
      default: nuevo = i.estado === 'en_reunion' ? 'trabajando' : 'esperando'; // completada, error → esperando
    }
    if (i.estado === 'en_reunion' && i.silla) { i.silla = null; this.emitir({ tipo: 'agente.reunion', id: i.agente.id, asiento: null }); }
    if (nuevo === 'en_reunion') {
      const silla = this.sillaLibre();
      if (silla) { i.silla = silla; this.emitir({ tipo: 'agente.reunion', id: i.agente.id, asiento: silla }); }
      else nuevo = 'pensando';
    }
    i.estado = nuevo;
    i.resta = this.duracion(nuevo);
    this.emitir({ tipo: 'agente.estado', id: i.agente.id, estado: nuevo });
  }

  private emitir(e: EventoOficina): void {
    for (const fn of this.oyentes) fn(e);
  }
}
