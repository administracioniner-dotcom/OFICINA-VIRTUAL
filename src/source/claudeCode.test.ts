import { describe, expect, it } from 'vitest';
import type { Agente } from '../domain/agentes';
import { FuenteClaudeCode, type Flujo } from './claudeCode';
import { FuenteCompuesta } from './compuesta';
import type { AgentSource, EventoOficina } from './tipos';

const real = (id: string, nombre: string): Agente => ({ id, nombre, departamento: 'cae', genero: 'f', camisa: '#000', variante: 0, asientoId: 's', estado: 'esperando', origen: 'real' });
const sim = (id: string, nombre: string): Agente => ({ ...real(id, nombre), origen: 'simulado', estado: 'trabajando' });

class FlujoFalso implements Flujo {
  cerrado = false;
  private oy = new Map<string, Array<(e: { data: string }) => void>>();
  addEventListener(t: string, fn: (e: { data: string }) => void) { this.oy.set(t, [...(this.oy.get(t) ?? []), fn]); }
  close() { this.cerrado = true; }
  emitir(t: string, data: unknown) { (this.oy.get(t) ?? []).forEach((f) => f({ data: typeof data === 'string' ? data : JSON.stringify(data) })); }
}

function montar(agentes: Agente[]) {
  const flujo = new FlujoFalso();
  const fuente = new FuenteClaudeCode({ crearFlujo: () => flujo, agentes: () => agentes });
  const ev: EventoOficina[] = [];
  fuente.suscribir((e) => ev.push(e));
  fuente.iniciar();
  return { flujo, fuente, ev };
}

describe('FuenteClaudeCode', () => {
  it('traduce avisos a eventos de oficina buscando al agente real por su nombre (sin mayúsculas ni espacios de más)', () => {
    const { flujo, ev } = montar([real('cae-1', 'Claude CAE')]);
    flujo.emitir('aviso', { tipo: 'estado', agente: '  claude cae ', estado: 'trabajando', t: 1 });
    flujo.emitir('aviso', { tipo: 'tarea', agente: 'Claude CAE', tarea: { id: 'p', titulo: 'Algo', estado: 'en_curso' }, t: 1 });
    flujo.emitir('aviso', { tipo: 'actividad', agente: 'Claude CAE', texto: 'Ejecuta npm', t: 1 });
    flujo.emitir('aviso', { tipo: 'conexion', agente: 'Claude CAE', conectado: true, t: 1 });
    expect(ev).toEqual([
      { tipo: 'agente.estado', id: 'cae-1', estado: 'trabajando' },
      { tipo: 'agente.tarea', id: 'cae-1', tarea: { id: 'p', titulo: 'Algo', estado: 'en_curso' } },
      { tipo: 'agente.actividad', id: 'cae-1', texto: 'Ejecuta npm' },
      { tipo: 'agente.conexion', id: 'cae-1', conectado: true },
    ]);
  });
  it('ignora avisos de nombres que no son de un agente real (un simulado nunca se mueve por Claude Code)', () => {
    const { flujo, ev } = montar([sim('a', 'Ana'), real('b', 'Real')]);
    flujo.emitir('aviso', { tipo: 'estado', agente: 'Ana', estado: 'error', t: 1 });
    flujo.emitir('aviso', { tipo: 'estado', agente: 'Nadie', estado: 'error', t: 1 });
    expect(ev).toEqual([]);
  });
  it('encuentra al agente aunque se haya creado después de iniciar', () => {
    const lista: Agente[] = [];
    const flujo = new FlujoFalso();
    const f = new FuenteClaudeCode({ crearFlujo: () => flujo, agentes: () => lista });
    const ev: EventoOficina[] = [];
    f.suscribir((e) => ev.push(e)); f.iniciar();
    lista.push(real('x', 'Nuevo'));
    flujo.emitir('aviso', { tipo: 'estado', agente: 'Nuevo', estado: 'pensando', t: 1 });
    expect(ev).toHaveLength(1);
  });
  it('la instantánea inicial se aplica aviso a aviso', () => {
    const { flujo, ev } = montar([real('a', 'Ana')]);
    flujo.emitir('instantanea', [
      { tipo: 'conexion', agente: 'Ana', conectado: true, t: 1 },
      { tipo: 'estado', agente: 'Ana', estado: 'trabajando', t: 1 },
    ]);
    expect(ev.map((e) => e.tipo)).toEqual(['agente.conexion', 'agente.estado']);
  });
  it('datos mal formados se descartan sin romper nada', () => {
    const { flujo, ev } = montar([real('a', 'Ana')]);
    for (const x of ['no es json', 'null', '5', '{"tipo":"estado","agente":"Ana","estado":"volando"}', '{"tipo":"tarea","agente":"Ana","tarea":{"id":1}}', '{"tipo":"actividad","agente":"Ana"}', '{"tipo":"conexion","agente":"Ana","conectado":"si"}', '{"tipo":"raro","agente":"Ana"}']) flujo.emitir('aviso', x);
    flujo.emitir('instantanea', 'no es json'); flujo.emitir('instantanea', '{"a":1}');
    expect(ev).toEqual([]);
  });
  it('el texto de actividad se recorta a 120 caracteres', () => {
    const { flujo, ev } = montar([real('a', 'Ana')]);
    flujo.emitir('aviso', { tipo: 'actividad', agente: 'Ana', texto: 'x'.repeat(500), t: 1 });
    expect((ev[0] as { texto: string }).texto).toHaveLength(120);
  });
  it('si se corta la conexión con el puente, todos los reales pasan a «sin señal»', () => {
    const { flujo, ev } = montar([real('a', 'Ana'), sim('b', 'Beto'), real('c', 'Cris')]);
    flujo.emitir('error', '');
    expect(ev).toEqual([{ tipo: 'agente.conexion', id: 'a', conectado: false }, { tipo: 'agente.conexion', id: 'c', conectado: false }]);
  });
  it('detener cierra el flujo y desuscribirse deja de entregar', () => {
    const { flujo, fuente } = montar([]);
    fuente.detener();
    expect(flujo.cerrado).toBe(true);
  });
});

describe('FuenteCompuesta', () => {
  class Falsa implements AgentSource {
    marcas: string[] = []; oy = new Set<(e: EventoOficina) => void>();
    constructor(private n: string) {}
    iniciar() { this.marcas.push(`${this.n}:iniciar`); }
    detener() { this.marcas.push(`${this.n}:detener`); }
    suscribir(fn: (e: EventoOficina) => void) { this.oy.add(fn); return () => { this.oy.delete(fn); }; }
    emitir(e: EventoOficina) { this.oy.forEach((f) => f(e)); }
  }
  it('inicia y detiene todas, y junta los eventos de todas', () => {
    const a = new Falsa('a'), b = new Falsa('b');
    const c = new FuenteCompuesta([a, b]);
    const ev: EventoOficina[] = [];
    const baja = c.suscribir((e) => ev.push(e));
    c.iniciar(); c.detener();
    expect(a.marcas).toEqual(['a:iniciar', 'a:detener']); expect(b.marcas).toEqual(['b:iniciar', 'b:detener']);
    a.emitir({ tipo: 'agente.baja', id: '1' }); b.emitir({ tipo: 'agente.baja', id: '2' });
    expect(ev).toHaveLength(2);
    baja();
    a.emitir({ tipo: 'agente.baja', id: '3' });
    expect(ev).toHaveLength(2);
  });
});
