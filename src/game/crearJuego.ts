import Phaser from 'phaser';
import type { Plano } from '../domain/plano';
import { PALETA } from './paleta';
import { OfficeScene } from './OfficeScene';

export function crearJuego(contenedor: HTMLElement, plano: Plano): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: contenedor,
    backgroundColor: PALETA.fondo,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.RESIZE, width: contenedor.clientWidth || 800, height: contenedor.clientHeight || 600 },
    scene: [new OfficeScene(plano)],
  });
}
