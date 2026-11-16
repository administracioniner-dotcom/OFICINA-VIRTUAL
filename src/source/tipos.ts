import type { Agente, EstadoAgente } from '../domain/agentes';

export type EventoOficina =
  | { tipo: 'agente.alta'; agente: Agente }
  | { tipo: 'agente.estado'; id: string; estado: EstadoAgente }
  /** Se han cambiado los datos del agente (nombre, puesto, aspecto…). */
  | { tipo: 'agente.cambio'; agente: Agente }
  | { tipo: 'agente.baja'; id: string }
  /** Tarea de un agente real: nueva o actualizada. */
  | { tipo: 'agente.tarea'; id: string; tarea: { id: string; titulo: string; estado: 'en_curso' | 'hecha' } }
  | { tipo: 'agente.actividad'; id: string; texto: string }
  /** El agente real ha dado señal (`conectado`) o ha dejado de darla. */
  | { tipo: 'agente.conexion'; id: string; conectado: boolean }
  /** `asiento`: silla de la sala de reuniones a la que va; `null`: vuelve a su puesto. */
  | { tipo: 'agente.reunion'; id: string; asiento: string | null };

/** Quien produzca los eventos de la oficina: hoy el simulador; mañana agentes reales. */
export interface AgentSource {
  iniciar(): void;
  detener(): void;
  suscribir(fn: (e: EventoOficina) => void): () => void;
}
