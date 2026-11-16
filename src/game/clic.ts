/** Lo que se necesita de un puntero para decidir si fue un clic sobre el mapa. */
export interface PunteroClic { button: number; distancia: number; upElement: unknown }

const UMBRAL_ARRASTRE = 5;

/**
 * ¿Es un clic izquierdo corto que se soltó sobre el lienzo del juego?
 * Phaser escucha el ratón en toda la ventana: si se suelta sobre una ficha o un botón, no es un clic en el mapa.
 */
export function esClicEnLienzo(p: PunteroClic, lienzo: unknown): boolean {
  return p.button === 0 && p.distancia < UMBRAL_ARRASTRE && p.upElement === lienzo;
}
