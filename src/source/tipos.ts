import type { Agente, EstadoAgente } from '../domain/agentes';

export type EventoOficina =
  | { tipo: 'agente.alta'; agente: Agente }
  | { tipo: 'agente.estado'; id: string; estado: EstadoAgente }
  /** Se han cambiado los datos del agente (nombre, puesto, aspecto…). */
  | { tipo: 'agente.cambio'; agente: Agente }
  | { tipo: 'agente.baja'; id: string }
  /** `asiento`: silla de la sala de reuniones a la que va; `null`: vuelve a su puesto. */
  | { tipo: 'agente.reunion'; id: string; asiento: string | null };

/** Quien produzca los eventos de la oficina: hoy el simulador; mañana agentes reales. */
export interface AgentSource {
  iniciar(): void;
  detener(): void;
  suscribir(fn: (e: EventoOficina) => void): () => void;
}
