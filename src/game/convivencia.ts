import type { Direccion } from './sprites/personaje';

export interface Posicionado { id: string; x: number; y: number }

const ALCANCE = 24; // distancia por delante a la que se considera que el otro «cierra el paso» (px)
const ANCHO = 14;   // margen lateral (px)
const ESPERA_MAXIMA = 1.2; // s: pasado este tiempo, sigue andando para no bloquearse nunca

/** ¿Hay alguien con más prioridad (id menor) justo delante en la dirección de marcha? */
export function debeCederPaso(yo: Posicionado & { dir: Direccion }, otros: readonly Posicionado[]): boolean {
  const [fx, fy] = yo.dir === 'este' ? [1, 0] : yo.dir === 'oeste' ? [-1, 0] : yo.dir === 'sur' ? [0, 1] : [0, -1];
  return otros.some((o) => {
    if (o.id >= yo.id) return false;
    const dx = o.x - yo.x, dy = o.y - yo.y;
    const delante = dx * fx + dy * fy;
    const lateral = Math.abs(dx * fy - dy * fx);
    return delante > 0 && delante <= ALCANCE && lateral <= ANCHO;
  });
}

/** Espera a que se despeje el paso, como mucho `ESPERA_MAXIMA` segundos seguidos. */
export function decidirEspera(bloqueado: boolean, acum: number, dt: number): { espera: boolean; acum: number } {
  if (!bloqueado) return { espera: false, acum: 0 };
  const nuevo = acum + dt;
  return { espera: nuevo <= ESPERA_MAXIMA, acum: nuevo };
}
