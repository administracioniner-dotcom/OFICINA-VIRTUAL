import type { Plano } from '../domain/plano';

/**
 * Máscara de una baldosa de muro según sus vecinas: bit 1 = norte, 2 = este, 4 = sur, 8 = oeste.
 * Un 1 significa «por ese lado no hay muro» (se dibuja el borde; por el sur, además, la cara frontal).
 * Las ventanas cuentan como muro; fuera del mapa cuenta como abierto.
 */
export function mascaraMuro(p: Plano, x: number, y: number): number {
  const muro = new Set([...p.muros, ...p.ventanas].map(([a, b]) => `${a},${b}`));
  const abierto = (a: number, b: number) => !muro.has(`${a},${b}`);
  return (abierto(x, y - 1) ? 1 : 0) | (abierto(x + 1, y) ? 2 : 0) | (abierto(x, y + 1) ? 4 : 0) | (abierto(x - 1, y) ? 8 : 0);
}
