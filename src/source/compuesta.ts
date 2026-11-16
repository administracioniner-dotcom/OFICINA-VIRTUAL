import type { AgentSource, EventoOficina } from './tipos';

/** Junta varias fuentes (el simulador y Claude Code) como si fueran una. */
export class FuenteCompuesta implements AgentSource {
  constructor(private readonly fuentes: readonly AgentSource[]) {}
  iniciar(): void { this.fuentes.forEach((f) => f.iniciar()); }
  detener(): void { this.fuentes.forEach((f) => f.detener()); }
  suscribir(fn: (e: EventoOficina) => void): () => void {
    const bajas = this.fuentes.map((f) => f.suscribir(fn));
    return () => bajas.forEach((b) => b());
  }
}
