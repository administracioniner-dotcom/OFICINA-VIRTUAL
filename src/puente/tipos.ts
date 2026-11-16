import type { EstadoAgente } from '../domain/agentes';

/** Un aviso ya traducido, con el agente identificado por su NOMBRE (la página lo une con su id). */
export type AvisoOficina =
  | { tipo: 'estado'; agente: string; estado: EstadoAgente; t: number }
  | { tipo: 'tarea'; agente: string; tarea: { id: string; titulo: string; estado: 'en_curso' | 'hecha' }; t: number }
  | { tipo: 'actividad'; agente: string; texto: string; t: number }
  | { tipo: 'conexion'; agente: string; conectado: boolean; t: number };

/** Lo que el servidor necesita del núcleo del puente. */
export interface PuenteLike {
  /** Recibe el cuerpo de un aviso del hook (ya leído como JSON, sin fiarse de su forma). */
  recibir(crudo: unknown): void;
  suscribir(fn: (a: AvisoOficina) => void): () => void;
  /** Último estado conocido de cada agente, para quien se conecta ahora. */
  instantanea(): AvisoOficina[];
}
