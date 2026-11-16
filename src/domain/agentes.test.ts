import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { asientosDelPlano } from '../game/asientos';
import { crearAgentes, crearAgentesExtra } from './agentes';
import { cargarPlano } from './plano';

const p = cargarPlano(datos);
const asientos = asientosDelPlano(p);
const agentes = crearAgentes(asientos);

describe('crearAgentes', () => {
  it('crea los 9 agentes de la fase 1, uno por puesto de trabajo ocupado', () => {
    expect(agentes).toHaveLength(9);
    expect(new Set(agentes.map((a) => a.id)).size).toBe(9);
    expect(new Set(agentes.map((a) => a.asientoId)).size).toBe(9);
  });
  it('reparto por departamento: Dirección 1, Ingeniería 2 y uno en el resto', () => {
    const cuenta: Record<string, number> = {};
    for (const a of agentes) cuenta[a.departamento] = (cuenta[a.departamento] ?? 0) + 1;
    expect(cuenta).toEqual({ direccion: 1, ingenieria: 2, compras: 1, recepcion: 1, desarrollo: 1, marketing: 1, cae: 1, admin: 1 });
  });
  it('género: Dirección, Ingeniería y CAE chicos; Compras, Recepción, Desarrollo, Administración y Marketing chicas', () => {
    const g = (d: string) => agentes.filter((a) => a.departamento === d).map((a) => a.genero);
    expect(g('ingenieria')).toEqual(['m', 'm']);
    expect(g('cae')).toEqual(['m']);
    for (const d of ['compras', 'recepcion', 'desarrollo', 'admin', 'marketing']) expect(g(d)).toEqual(['f']);
    expect(g('direccion')).toEqual(['m']);
  });
  it('cada agente se sienta en un asiento de su propio departamento y los de Ingeniería en escritorio', () => {
    for (const a of agentes) {
      const s = asientos.find((x) => x.id === a.asientoId)!;
      expect(s.zona, a.id).toBe(a.departamento);
      if (a.departamento === 'ingenieria') expect(s.tipo).toBe('escritorio');
    }
  });
  it('los nombres son neutros y marcan la numeración («Agente CAE 1»)', () => {
    expect(agentes.find((a) => a.departamento === 'cae')!.nombre).toBe('Agente CAE 1');
    expect(agentes.filter((a) => a.departamento === 'direccion').map((a) => a.nombre)).toEqual(['Agente Dirección 1']);
  });
  it('cada agente trae un color de camisa y una variante de aspecto', () => {
    for (const a of agentes) { expect(a.camisa).toMatch(/^#[0-9a-f]{6}$/); expect(Number.isInteger(a.variante)).toBe(true); }
  });
});

describe('crearAgentesExtra (prueba de carga)', () => {
  const extra = crearAgentesExtra(asientos, agentes);
  it('añade 5 agentes en los puestos libres: el 2º escritorio de Dirección y los 4 de la mesa de Ingeniería', () => {
    expect(extra).toHaveLength(5);
    expect(new Set([...agentes, ...extra].map((a) => a.asientoId)).size).toBe(14);
    expect(new Set([...agentes, ...extra].map((a) => a.id)).size).toBe(14);
  });
  it('no usa sillas de la sala de reuniones y cada uno está en su departamento', () => {
    for (const a of extra) {
      const s = asientos.find((x) => x.id === a.asientoId)!;
      expect(s.tipo).not.toBe('reuniones');
      expect(s.zona).toBe(a.departamento);
    }
  });
  it('lleva nombre neutro y estado inicial', () => {
    for (const a of extra) { expect(a.nombre).toMatch(/^Agente .+ \d+$/); expect(a.estado).toBe('trabajando'); }
  });
});
