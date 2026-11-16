import { describe, expect, it } from 'vitest';
import type { Agente } from './agentes';
import { generarTareas } from './tareas';

const agente = (departamento: Agente['departamento'], id = 'x-1'): Agente => ({
  id, nombre: 'Agente', departamento, genero: 'f', camisa: '#000000', variante: 0, asientoId: 's', estado: 'trabajando',
});

describe('generarTareas', () => {
  it('genera 3 tareas pendientes por agente, con ids únicos y del propio agente', () => {
    const t = generarTareas(agente('cae'), 1);
    expect(t).toHaveLength(3);
    expect(new Set(t.map((x) => x.id)).size).toBe(3);
    for (const x of t) { expect(x.agenteId).toBe('x-1'); expect(x.estado).toBe('pendiente'); }
  });
  it('los títulos dependen del departamento y se marcan como simuladas', () => {
    const cae = generarTareas(agente('cae'), 1).map((x) => x.titulo);
    const dev = generarTareas(agente('desarrollo'), 1).map((x) => x.titulo);
    expect(cae).not.toEqual(dev);
    for (const t of [...cae, ...dev]) expect(t).toMatch(/\(simulada\)$/);
  });
  it('lo siguiente que se genera tiene ids nuevos (numeración continua)', () => {
    const a = generarTareas(agente('admin'), 1), b = generarTareas(agente('admin'), 4);
    expect(new Set([...a, ...b].map((x) => x.id)).size).toBe(6);
  });
  it('hay títulos para todos los departamentos con agentes', () => {
    for (const d of ['direccion', 'ingenieria', 'compras', 'recepcion', 'desarrollo', 'marketing', 'cae', 'admin'] as const) {
      expect(generarTareas(agente(d), 1).every((x) => x.titulo.length > 10)).toBe(true);
    }
  });
});
