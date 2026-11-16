import { describe, expect, it } from 'vitest';
import type { Agente, EstadoAgente } from '../domain/agentes';
import { SimuladorAgentes } from './simulado';
import type { EventoOficina } from './tipos';

const agentes: Agente[] = Array.from({ length: 10 }, (_, i) => ({
  id: `a${i}`, nombre: `Agente ${i}`, departamento: 'cae', genero: 'm', camisa: '#00897b', variante: i, asientoId: `s${i}`, estado: 'trabajando',
}));
const sillas = Array.from({ length: 8 }, (_, i) => `r${i}`);

/** Generador pseudoaleatorio con semilla (para que las pruebas sean repetibles). */
const semilla = (s: number) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

function simular(segundos: number, azar = semilla(7)) {
  const sim = new SimuladorAgentes(agentes, sillas, azar);
  const eventos: Array<EventoOficina & { t: number }> = [];
  let t = 0;
  sim.suscribir((e) => eventos.push({ ...e, t }));
  sim.iniciar();
  for (; t < segundos; t += 0.5) sim.avanzar(0.5);
  return { sim, eventos };
}

describe('SimuladorAgentes', () => {
  it('al iniciar da de alta a los 10 agentes', () => {
    const { eventos } = simular(0);
    expect(eventos.filter((e) => e.tipo === 'agente.alta')).toHaveLength(10);
  });

  it('los estados que emite siempre son válidos y aparecen los seis', () => {
    const { eventos } = simular(3600);
    const validos: EstadoAgente[] = ['trabajando', 'pensando', 'esperando', 'en_reunion', 'completada', 'error'];
    const vistos = new Set<string>();
    for (const e of eventos) if (e.tipo === 'agente.estado') { expect(validos).toContain(e.estado); vistos.add(e.estado); }
    expect([...vistos].sort()).toEqual([...validos].sort());
  });

  it('nunca hay más de 8 agentes en reunión ni dos en la misma silla', () => {
    const { eventos } = simular(3600);
    const ocupadas = new Map<string, string>();
    let max = 0;
    for (const e of eventos) {
      if (e.tipo !== 'agente.reunion') continue;
      if (e.asiento) {
        expect(sillas).toContain(e.asiento);
        expect(ocupadas.has(e.asiento), `silla ${e.asiento} ya ocupada`).toBe(false);
        ocupadas.set(e.asiento, e.id);
      } else {
        for (const [s, id] of ocupadas) if (id === e.id) ocupadas.delete(s);
      }
      max = Math.max(max, ocupadas.size);
    }
    expect(max).toBeLessThanOrEqual(8);
    expect(max).toBeGreaterThan(0);
  });

  it('«completada» pasa a «esperando» en unos 3 s y «error» se resuelve en menos de 7 s', () => {
    const { eventos } = simular(3600);
    const porAgente = new Map<string, Array<{ estado: EstadoAgente; t: number }>>();
    for (const e of eventos) if (e.tipo === 'agente.estado') porAgente.set(e.id, [...(porAgente.get(e.id) ?? []), { estado: e.estado, t: e.t }]);
    let comprobados = 0;
    for (const seq of porAgente.values()) {
      seq.forEach((x, i) => {
        const sig = seq[i + 1];
        if (!sig) return;
        if (x.estado === 'completada') { expect(sig.estado).toBe('esperando'); expect(sig.t - x.t).toBeLessThanOrEqual(4); comprobados++; }
        if (x.estado === 'error') { expect(sig.estado).toBe('esperando'); expect(sig.t - x.t).toBeLessThanOrEqual(7); comprobados++; }
      });
    }
    expect(comprobados).toBeGreaterThan(5);
  });

  it('con la misma semilla produce los mismos eventos', () => {
    const a = simular(600, semilla(3)).eventos.map((e) => JSON.stringify(e));
    const b = simular(600, semilla(3)).eventos.map((e) => JSON.stringify(e));
    expect(a).toEqual(b);
  });

  it('tras detener no emite nada más y se puede cancelar la suscripción', () => {
    const sim = new SimuladorAgentes(agentes, sillas, semilla(1));
    let n = 0;
    const quitar = sim.suscribir(() => n++);
    sim.iniciar();
    sim.detener();
    const antes = n;
    for (let i = 0; i < 200; i++) sim.avanzar(0.5);
    expect(n).toBe(antes);
    quitar();
  });
});

describe('SimuladorAgentes: altas, cambios y bajas en marcha', () => {
  const nuevo = (id: string): Agente => ({ ...agentes[0]!, id, nombre: `Agente ${id}`, asientoId: `s-${id}` });
  const arrancar = () => {
    const sim = new SimuladorAgentes(agentes.slice(0, 2), sillas, semilla(5));
    const eventos: EventoOficina[] = [];
    sim.suscribir((e) => eventos.push(e));
    sim.iniciar();
    eventos.length = 0;
    return { sim, eventos };
  };
  it('agregar da de alta al agente y luego empieza a cambiar de estado', () => {
    const { sim, eventos } = arrancar();
    sim.agregar(nuevo('n1'));
    expect(eventos).toEqual([expect.objectContaining({ tipo: 'agente.alta', agente: expect.objectContaining({ id: 'n1' }) })]);
    for (let i = 0; i < 200; i++) sim.avanzar(0.5);
    expect(eventos.some((e) => e.tipo === 'agente.estado' && e.id === 'n1')).toBe(true);
  });
  it('actualizar emite «cambio» con los datos nuevos y conserva el estado actual', () => {
    const { sim, eventos } = arrancar();
    sim.actualizar({ ...agentes[0]!, nombre: 'Otro nombre' });
    expect(eventos).toEqual([expect.objectContaining({ tipo: 'agente.cambio', agente: expect.objectContaining({ id: agentes[0]!.id, nombre: 'Otro nombre', estado: 'trabajando' }) })]);
  });
  it('quitar emite «baja» y ese agente ya no genera más eventos', () => {
    const { sim, eventos } = arrancar();
    sim.quitar(agentes[0]!.id);
    expect(eventos).toEqual([{ tipo: 'agente.baja', id: agentes[0]!.id }]);
    eventos.length = 0;
    for (let i = 0; i < 400; i++) sim.avanzar(0.5);
    expect(eventos.some((e) => e.tipo === 'agente.estado' && e.id === agentes[0]!.id)).toBe(false);
  });
  it('quitar a quien está en una reunión libera su silla antes de darlo de baja', () => {
    const { sim, eventos } = arrancar();
    for (let i = 0; i < 4000 && !eventos.some((e) => e.tipo === 'agente.reunion' && e.asiento); i++) sim.avanzar(0.5);
    const entra = eventos.find((e): e is Extract<EventoOficina, { tipo: 'agente.reunion' }> => e.tipo === 'agente.reunion' && !!e.asiento)!;
    expect(entra).toBeDefined();
    eventos.length = 0;
    sim.quitar(entra.id);
    expect(eventos.map((e) => e.tipo)).toEqual(['agente.reunion', 'agente.baja']);
    expect(eventos[0]).toMatchObject({ id: entra.id, asiento: null });
  });
  it('quitar o actualizar a alguien que no existe no emite nada', () => {
    const { sim, eventos } = arrancar();
    sim.quitar('nadie');
    sim.actualizar(nuevo('nadie'));
    expect(eventos).toEqual([]);
  });
  it('lo agregado antes de iniciar se da de alta al iniciar', () => {
    const sim = new SimuladorAgentes([], sillas, semilla(2));
    const eventos: EventoOficina[] = [];
    sim.suscribir((e) => eventos.push(e));
    sim.agregar(nuevo('antes'));
    expect(eventos).toEqual([]);
    sim.iniciar();
    expect(eventos).toEqual([expect.objectContaining({ tipo: 'agente.alta' })]);
  });
});

