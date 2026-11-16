import { esReal, type Agente, type EstadoAgente } from '../domain/agentes';
import type { AgentSource, EventoOficina } from './tipos';

/** Lo mínimo que se usa de `EventSource` (así se puede probar sin navegador). */
export interface Flujo {
  addEventListener(tipo: string, fn: (e: { data: string }) => void): void;
  close(): void;
}

interface Opciones {
  crearFlujo: () => Flujo;
  /** Lista actual de agentes; se mira en cada aviso, así vale para agentes creados después. */
  agentes: () => readonly Agente[];
}

const ESTADOS: ReadonlySet<string> = new Set<EstadoAgente>(['trabajando', 'pensando', 'esperando', 'completada', 'error']);
const MAX_TEXTO = 120;
const clave = (n: string) => n.trim().toLowerCase();
const esTexto = (v: unknown): v is string => typeof v === 'string';

/**
 * Agentes REALES: recibe del puente local (servidor de Vite → SSE) los avisos de los Claude Code conectados
 * y los convierte en eventos de la oficina. Solo mueve a agentes de origen «real», buscados por su nombre.
 */
export class FuenteClaudeCode implements AgentSource {
  private readonly oyentes = new Set<(e: EventoOficina) => void>();
  private flujo: Flujo | undefined;
  constructor(private readonly op: Opciones) {}

  suscribir(fn: (e: EventoOficina) => void): () => void {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  }

  iniciar(): void {
    if (this.flujo) return;
    let f: Flujo;
    try { f = this.op.crearFlujo(); } catch { return; }
    this.flujo = f;
    f.addEventListener('aviso', (e) => this.aplicar(this.leer(e.data)));
    f.addEventListener('instantanea', (e) => {
      const lista = this.leer(e.data);
      if (Array.isArray(lista)) lista.forEach((a) => this.aplicar(a));
    });
    // Sin puente (se cerró el servidor o la conexión): ningún real tiene señal.
    f.addEventListener('error', () => {
      for (const a of this.op.agentes()) if (esReal(a)) this.emitir({ tipo: 'agente.conexion', id: a.id, conectado: false });
    });
  }

  detener(): void { this.flujo?.close(); this.flujo = undefined; }

  private leer(data: string): unknown { try { return JSON.parse(data); } catch { return null; } }

  private aplicar(x: unknown): void {
    if (x === null || typeof x !== 'object' || Array.isArray(x)) return;
    const a = x as Record<string, unknown>;
    if (!esTexto(a.agente)) return;
    const nombre = clave(a.agente);
    const ag = this.op.agentes().find((g) => esReal(g) && clave(g.nombre) === nombre);
    if (!ag) return;
    switch (a.tipo) {
      case 'estado':
        if (esTexto(a.estado) && ESTADOS.has(a.estado)) this.emitir({ tipo: 'agente.estado', id: ag.id, estado: a.estado as EstadoAgente });
        break;
      case 'tarea': {
        const t = a.tarea as Record<string, unknown> | null;
        if (t && esTexto(t.id) && esTexto(t.titulo) && (t.estado === 'en_curso' || t.estado === 'hecha'))
          this.emitir({ tipo: 'agente.tarea', id: ag.id, tarea: { id: t.id, titulo: t.titulo, estado: t.estado } });
        break;
      }
      case 'actividad':
        if (esTexto(a.texto)) this.emitir({ tipo: 'agente.actividad', id: ag.id, texto: a.texto.slice(0, MAX_TEXTO) });
        break;
      case 'conexion':
        if (typeof a.conectado === 'boolean') this.emitir({ tipo: 'agente.conexion', id: ag.id, conectado: a.conectado });
        break;
    }
  }

  private emitir(e: EventoOficina): void { for (const fn of [...this.oyentes]) fn(e); }
}
