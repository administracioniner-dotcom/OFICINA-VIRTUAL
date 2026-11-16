import { describe, expect, it } from 'vitest';
import type { Agente } from '../domain/agentes';
import { SimuladorAgentes } from './simulado';
import type { EventoOficina } from './tipos';

const mk = (id: string, origen: 'simulado' | 'real'): Agente => ({
  id, nombre: id, departamento: 'cae', genero: 'm', camisa: '#00897b', variante: 0, asientoId: `s-${id}`, estado: origen === 'real' ? 'esperando' : 'trabajando', origen,
});

describe('el simulador y los agentes reales', () => {
  it('da de alta al agente real pero nunca le cambia el estado ni lo manda a reuniones', () => {
    const sim = new SimuladorAgentes([mk('sim', 'simulado'), mk('real', 'real')], ['r0', 'r1'], () => 0.5);
    const ev: EventoOficina[] = [];
    sim.suscribir((e) => ev.push(e));
    sim.iniciar();
    for (let t = 0; t < 600; t += 0.5) sim.avanzar(0.5);
    expect(ev.filter((e) => e.tipo === 'agente.alta').map((e) => (e as { agente: Agente }).agente.id).sort()).toEqual(['real', 'sim']);
    const delReal = ev.filter((e) => (e.tipo === 'agente.estado' || e.tipo === 'agente.reunion') && e.id === 'real');
    expect(delReal).toEqual([]);
    expect(ev.some((e) => e.tipo === 'agente.estado' && e.id === 'sim')).toBe(true);
    sim.detener();
  });
  it('un agente real añadido después tampoco se simula', () => {
    const sim = new SimuladorAgentes([], ['r0'], () => 0.5);
    const ev: EventoOficina[] = [];
    sim.suscribir((e) => ev.push(e));
    sim.iniciar();
    sim.agregar(mk('real', 'real'));
    for (let t = 0; t < 300; t += 0.5) sim.avanzar(0.5);
    expect(ev.filter((e) => e.tipo === 'agente.estado')).toEqual([]);
    sim.detener();
  });
});
