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
