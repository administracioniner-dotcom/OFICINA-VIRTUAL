import Phaser from 'phaser';
import type { Agente } from '../../domain/agentes';
import { dibujarGlobo, type EstadoAgente } from './globos';
import { ALTO_FOTOGRAMA, ANCHO_FOTOGRAMA, aspecto, dibujarPersonaje, type Direccion } from './personaje';

export const DIRECCIONES: readonly Direccion[] = ['sur', 'norte', 'este', 'oeste'];
export const claveHoja = (id: string) => `pj-${id}`;
export const claveGlobo = (e: EstadoAgente) => `globo-${e}`;
const ESTADOS: readonly EstadoAgente[] = ['trabajando', 'pensando', 'esperando', 'en_reunion', 'completada', 'error'];

/** Hoja de un agente: por cada dirección, 4 fotogramas de caminar (`sur-c0`…) y 2 sentado (`sur-s0`, `sur-s1`). */
export function generarHoja(escena: Phaser.Scene, a: Agente): string {
  const clave = claveHoja(a.id);
  if (escena.textures.exists(clave)) return clave;
  const t = escena.textures.createCanvas(clave, ANCHO_FOTOGRAMA * 6, ALTO_FOTOGRAMA * DIRECCIONES.length);
  if (!t) throw new Error(`No se pudo crear la hoja de ${a.id}`);
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  const asp = aspecto(a.camisa, a.variante, a.genero);
  DIRECCIONES.forEach((dir, fila) => {
    for (let f = 0; f < 4; f++) {
      dibujarPersonaje(c, f * ANCHO_FOTOGRAMA, fila * ALTO_FOTOGRAMA, asp, dir, f, false);
      t.add(`${dir}-c${f}`, 0, f * ANCHO_FOTOGRAMA, fila * ALTO_FOTOGRAMA, ANCHO_FOTOGRAMA, ALTO_FOTOGRAMA);
    }
    for (let f = 0; f < 2; f++) {
      const col = 4 + f;
      dibujarPersonaje(c, col * ANCHO_FOTOGRAMA, fila * ALTO_FOTOGRAMA, asp, dir, f, true);
      t.add(`${dir}-s${f}`, 0, col * ANCHO_FOTOGRAMA, fila * ALTO_FOTOGRAMA, ANCHO_FOTOGRAMA, ALTO_FOTOGRAMA);
    }
  });
  t.refresh();
  return clave;
}

export function generarGlobos(escena: Phaser.Scene): void {
  for (const e of ESTADOS) {
    if (escena.textures.exists(claveGlobo(e))) continue;
    const t = escena.textures.createCanvas(claveGlobo(e), 16, 16);
    if (!t) throw new Error('No se pudo crear un globo');
    const c = t.getContext();
    c.imageSmoothingEnabled = false;
    dibujarGlobo(c, 0, 0, e);
    t.refresh();
  }
}
