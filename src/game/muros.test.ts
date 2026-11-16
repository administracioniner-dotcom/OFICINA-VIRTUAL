import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { cargarPlano } from '../domain/plano';
import { mascaraMuro } from './muros';

const p = cargarPlano(datos);

describe('mascaraMuro', () => {
  it('bits: N=1, E=2, S=4, O=8; un 1 significa «ahí no hay muro»', () => {
    // (5,0): tramo norte con muro a izquierda y derecha, abierto por arriba (fuera del mapa) y por abajo
    expect(mascaraMuro(p, 5, 0)).toBe(1 | 4);
  });
  it('la esquina superior izquierda (0,0) está abierta por arriba y por la izquierda', () => {
    expect(mascaraMuro(p, 0, 0)).toBe(1 | 8);
  });
  it('un muro vertical del lado izquierdo (0,10) solo está abierto por la izquierda y la derecha', () => {
    expect(mascaraMuro(p, 0, 10)).toBe(2 | 8);
  });
  it('un muro rodeado de muro por abajo no enseña cara frontal (bit S a 0)', () => {
    expect(mascaraMuro(p, 0, 10) & 4).toBe(0);
  });
  it('la última baldosa de un tramo (9,0) con hueco de entrada a la derecha tiene E abierto', () => {
    expect(mascaraMuro(p, 9, 0) & 2).toBe(2);
  });
  it('las ventanas cuentan como muro para el vecino', () => {
    expect(mascaraMuro(p, 0, 19) & 2).toBe(0);
  });
});
