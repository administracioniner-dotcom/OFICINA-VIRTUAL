import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { asientosDelPlano } from '../game/asientos';
import { cargarPlano, rejillaBloqueada, type Celda } from './plano';
import { avanzar, buscarRuta } from './rutas';

const libre = (w: number, h: number) => Array.from({ length: h }, () => Array<boolean>(w).fill(false));

describe('buscarRuta', () => {
  it('en un mapa libre devuelve el camino más corto (sin diagonales)', () => {
    const r = buscarRuta(libre(5, 5), [0, 0], [3, 2])!;
    expect(r).toHaveLength(6);
    expect(r[0]).toEqual([0, 0]);
    expect(r[r.length - 1]).toEqual([3, 2]);
    for (let i = 1; i < r.length; i++) expect(Math.abs(r[i]![0] - r[i - 1]![0]) + Math.abs(r[i]![1] - r[i - 1]![1])).toBe(1);
  });
  it('rodea un muro', () => {
    const m = libre(5, 3);
    m[0]![2] = true; m[1]![2] = true;
    const r = buscarRuta(m, [0, 0], [4, 0])!;
    expect(r).not.toBeNull();
    expect(r.some(([x, y]) => x === 2 && y < 2)).toBe(false);
    expect(r.some(([x, y]) => x === 2 && y === 2)).toBe(true);
  });
  it('devuelve null si no hay camino, o si el destino está bloqueado', () => {
    const m = libre(5, 3);
    for (let y = 0; y < 3; y++) m[y]![2] = true;
    expect(buscarRuta(m, [0, 0], [4, 0])).toBeNull();
    expect(buscarRuta(libre(3, 3), [0, 0], [3, 3] as unknown as Celda)).toBeNull();
    const b = libre(3, 3); b[1]![1] = true;
    expect(buscarRuta(b, [0, 0], [1, 1])).toBeNull();
  });
  it('desde = hasta es una ruta de una baldosa', () => {
    expect(buscarRuta(libre(3, 3), [1, 1], [1, 1])).toEqual([[1, 1]]);
  });
  it('desde la entrada principal hasta cada asiento: ruta que nunca pisa una baldosa bloqueada', () => {
    const p = cargarPlano(datos);
    const bloq = rejillaBloqueada(p);
    for (const a of asientosDelPlano(p)) {
      const r = buscarRuta(bloq, [20, 0], a.acceso);
      expect(r, a.id).not.toBeNull();
      for (const [x, y] of r!) expect(bloq[y]![x], `${a.id} pisa (${x},${y})`).toBe(false);
    }
  });
});

describe('avanzar', () => {
  const ruta: Celda[] = [[0, 0], [1, 0], [1, 1]];
  const centro = (c: number) => c * 32 + 16;
  it('avanza velocidad × tiempo hacia la siguiente baldosa y mira en esa dirección', () => {
    const r = avanzar({ x: centro(0), y: centro(0), indice: 1 }, ruta, 0.1, 96);
    expect(r.estado.x).toBeCloseTo(centro(0) + 9.6);
    expect(r.dir).toBe('este');
    expect(r.terminado).toBe(false);
  });
  it('cambia de dirección al doblar la esquina y termina en el centro de la última baldosa', () => {
    let est = { x: centro(0), y: centro(0), indice: 1 };
    const dirs = new Set<string>();
    let terminado = false;
    for (let i = 0; i < 100 && !terminado; i++) {
      const r = avanzar(est, ruta, 0.05, 96);
      est = r.estado; terminado = r.terminado;
      if (r.dir) dirs.add(r.dir);
    }
    expect(terminado).toBe(true);
    expect(est.x).toBeCloseTo(centro(1)); expect(est.y).toBeCloseTo(centro(1));
    expect([...dirs].sort()).toEqual(['este', 'sur']);
  });
  it('con un dt enorme no se pasa del destino', () => {
    const r = avanzar({ x: centro(0), y: centro(0), indice: 1 }, ruta, 100, 96);
    expect(r.terminado).toBe(true);
    expect(r.estado.x).toBeCloseTo(centro(1)); expect(r.estado.y).toBeCloseTo(centro(1));
  });
  it('una ruta de una baldosa ya está terminada', () => {
    expect(avanzar({ x: centro(2), y: centro(2), indice: 1 }, [[2, 2]], 0.1, 96).terminado).toBe(true);
  });
});
