import Phaser from 'phaser';
import { zonaEn, type Plano, type Zona } from '../domain/plano';
import { ETIQUETA_ZONA } from '../domain/zonas';
import { PALETA, TILE } from './paleta';
import { claveObjeto } from './texturas/claves';
import { generarTexturas } from './texturas/registro';

const clave = (x: number, y: number) => `${x},${y}`;

export class OfficeScene extends Phaser.Scene {
  constructor(private readonly plano: Plano) {
    super('oficina');
  }

  create(): void {
    generarTexturas(this);
    const p = this.plano;

    const ocupadoMuro = new Set(p.muros.map(([x, y]) => clave(x, y)));
    const enDireccion = (x: number, y: number) => zonaEn(p, x, y)?.tipo === 'direccion';

    // Suelo: verde limón con variación; alfombra gris en Dirección
    for (let y = 0; y < p.alto; y++) {
      for (let x = 0; x < p.ancho; x++) {
        const variante = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const k = enDireccion(x, y) ? 'alfombra' : `suelo-${variante % 4}`;
        this.add.image(x * TILE, y * TILE, k).setOrigin(0).setDepth(0);
      }
    }

    // Muros, ventanas y mamparas (3/4: cara frontal solo si debajo no hay muro)
    for (const [x, y] of p.muros) {
      const k = ocupadoMuro.has(clave(x, y + 1)) ? 'muro' : 'muro-frente';
      this.add.image(x * TILE, y * TILE, k).setOrigin(0).setDepth((y + 1) * TILE);
    }
    for (const [x, y] of p.ventanas) this.add.image(x * TILE, y * TILE, 'ventana').setOrigin(0).setDepth((y + 1) * TILE);
    for (const [x, y] of p.mamparas) this.add.image(x * TILE, y * TILE, 'mampara').setOrigin(0).setDepth((y + 1) * TILE);
    for (const [x, y] of p.estanterias) {
      this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'estanteria').setAngle(90).setDepth((y + 1) * TILE);
    }

    // Objetos (el microondas va encima de su soporte)
    for (const o of p.objetos) {
      const zona = zonaEn(p, o.x, o.y)?.tipo;
      const suelo = o.tipo === 'entrada' || o.tipo === 'puerta';
      const profundidad = suelo ? 1 : (o.y + o.alto) * TILE + (o.sobre ? 1 : 0);
      this.add
        .image((o.x + o.ancho / 2) * TILE, (o.y + o.alto / 2) * TILE, claveObjeto(o, zona))
        .setAngle(o.giro)
        .setDepth(profundidad);
    }

    // Zonas: línea tenue de borde y rótulo
    const g = this.add.graphics().setDepth(2);
    for (const z of p.zonas) this.dibujarZona(g, z);

    // Encuadre provisional (la tarea 5 lo sustituye por los controles de cámara)
    const cam = this.cameras.main;
    cam.setZoom(Math.min(cam.width / (p.ancho * TILE), cam.height / (p.alto * TILE)));
    cam.centerOn((p.ancho * TILE) / 2, (p.alto * TILE) / 2);
  }

  private dibujarZona(g: Phaser.GameObjects.Graphics, z: Zona): void {
    g.lineStyle(1, 0x2a2e37, 0.35);
    g.strokeRect(z.x * TILE + 0.5, z.y * TILE + 0.5, z.ancho * TILE - 1, z.alto * TILE - 1);
    const t = this.add
      .text(z.x * TILE + 3, z.y * TILE + 3, ETIQUETA_ZONA[z.tipo], {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: PALETA.blanco,
        wordWrap: { width: z.ancho * TILE - 6, useAdvancedWrap: true },
      })
      .setStroke(PALETA.contorno, 3)
      .setDepth(p_ETIQUETA)
      .setResolution(2);
    t.setAlpha(0.95);
  }
}

const p_ETIQUETA = 100000;
