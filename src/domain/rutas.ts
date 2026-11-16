import type { Celda } from './plano';

export interface EstadoMovimiento { x: number; y: number; indice: number }
export type DireccionPaso = 'norte' | 'sur' | 'este' | 'oeste';
export interface PasoMovimiento { estado: EstadoMovimiento; dir: DireccionPaso | null; terminado: boolean }

const TILE = 32;

/** A* de 4 direcciones. `bloqueada` se indexa [y][x]. Devuelve la ruta con inicio y fin, o null si no hay camino. */
export function buscarRuta(bloqueada: readonly (readonly boolean[])[], desde: Celda, hasta: Celda): Celda[] | null {
  const alto = bloqueada.length, ancho = bloqueada[0]?.length ?? 0;
  const dentro = ([x, y]: Celda) => x >= 0 && y >= 0 && x < ancho && y < alto;
  if (!dentro(desde) || !dentro(hasta) || bloqueada[hasta[1]]![hasta[0]]) return null;
  const clave = ([x, y]: Celda) => y * ancho + x;
  const h = ([x, y]: Celda) => Math.abs(x - hasta[0]) + Math.abs(y - hasta[1]);
  const g = new Map<number, number>([[clave(desde), 0]]);
  const padre = new Map<number, Celda>();
  const abiertos: Array<{ c: Celda; f: number }> = [{ c: desde, f: h(desde) }];
  const cerrados = new Set<number>();
  while (abiertos.length) {
    let mejor = 0;
    for (let i = 1; i < abiertos.length; i++) if (abiertos[i]!.f < abiertos[mejor]!.f) mejor = i;
    const { c } = abiertos.splice(mejor, 1)[0]!;
    const kc = clave(c);
    if (cerrados.has(kc)) continue;
    cerrados.add(kc);
    if (c[0] === hasta[0] && c[1] === hasta[1]) {
      const ruta: Celda[] = [c];
      let k = kc;
      while (padre.has(k)) { const pr = padre.get(k)!; ruta.unshift(pr); k = clave(pr); }
      return ruta;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n: Celda = [c[0] + dx, c[1] + dy];
      if (!dentro(n) || bloqueada[n[1]]![n[0]]) continue;
      const kn = clave(n), gn = g.get(kc)! + 1;
      if (gn < (g.get(kn) ?? Infinity)) { g.set(kn, gn); padre.set(kn, c); abiertos.push({ c: n, f: gn + h(n) }); }
    }
  }
  return null;
}

/**
 * Mueve a un personaje a lo largo de una ruta de baldosas, a `velocidad` píxeles por segundo.
 * `indice` es la siguiente baldosa de la ruta a la que se dirige. Puede cruzar varias baldosas en un paso.
 */
export function avanzar(est: EstadoMovimiento, ruta: readonly Celda[], dtSeg: number, velocidad: number): PasoMovimiento {
  let { x, y, indice } = est;
  let resto = velocidad * dtSeg;
  let dir: DireccionPaso | null = null;
  while (indice < ruta.length && resto > 0) {
    const [cx, cy] = ruta[indice]!;
    const tx = cx * TILE + TILE / 2, ty = cy * TILE + TILE / 2;
    const dx = tx - x, dy = ty - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'este' : 'oeste') : (dy > 0 ? 'sur' : 'norte');
    if (dist <= resto) { x = tx; y = ty; resto -= dist; indice++; }
    else { x += (dx / dist) * resto; y += (dy / dist) * resto; resto = 0; }
  }
  return { estado: { x, y, indice }, dir, terminado: indice >= ruta.length };
}
