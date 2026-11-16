import Phaser from 'phaser';
import { mamparasVisibles, zonaEn, type Plano, type TipoZona, type Zona } from '../domain/plano';
import { bus } from '../state/bus';
import { instalarControles, type ControlCamara } from './camara/controles';
import { PALETA, TILE } from './paleta';
import { colocarRotulos } from './rotulos';
import { claveObjeto } from './texturas/claves';
import { generarTexturas } from './texturas/registro';

const clave = (x: number, y: number) => `${x},${y}`;

export class OfficeScene extends Phaser.Scene {
  private camara!: ControlCamara;
  private resalte?: Phaser.GameObjects.Graphics;

  constructor(private readonly plano: Plano) {
    super('oficina');
  }

  create(): void {
    generarTexturas(this);
    const p = this.plano;

    const ocupadoMuro = new Set(p.muros.map(([x, y]) => clave(x, y)));
    const enDireccion = (x: number, y: number) => zonaEn(p, x, y)?.tipo === 'direccion';

    // Suelo: verde limón con variación; alfombra gris en Dirección.
    // Se pinta una sola vez en una textura para no dibujar 740 baldosas en cada fotograma.
    const suelo = this.add.renderTexture(0, 0, p.ancho * TILE, p.alto * TILE).setOrigin(0).setDepth(0);
    for (let y = 0; y < p.alto; y++) {
      for (let x = 0; x < p.ancho; x++) {
        const variante = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        suelo.draw(enDireccion(x, y) ? 'alfombra' : `suelo-${variante % 4}`, x * TILE, y * TILE);
      }
    }

    // Muros, ventanas y mamparas (3/4: cara frontal solo si debajo no hay muro)
    for (const [x, y] of p.muros) {
      const k = ocupadoMuro.has(clave(x, y + 1)) ? 'muro' : 'muro-frente';
      this.add.image(x * TILE, y * TILE, k).setOrigin(0).setDepth((y + 1) * TILE);
    }
    for (const [x, y] of p.ventanas) this.add.image(x * TILE, y * TILE, 'ventana').setOrigin(0).setDepth((y + 1) * TILE);
    for (const [x, y] of mamparasVisibles(p)) this.add.image(x * TILE, y * TILE, 'mampara').setOrigin(0).setDepth((y + 1) * TILE);
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

    // Zonas: línea tenue de borde (con un pequeño margen entre vecinas) y rótulo
    const g = this.add.graphics().setDepth(2);
    for (const z of p.zonas) {
      g.lineStyle(1, 0x2a2e37, 0.45);
      g.strokeRect(z.x * TILE + 2.5, z.y * TILE + 2.5, z.ancho * TILE - 5, z.alto * TILE - 5);
    }
    for (const r of colocarRotulos(p)) {
      this.add
        .text(r.x, r.y, r.lineas.join('\n'), {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: PALETA.blanco,
          lineSpacing: 2,
        })
        .setStroke(PALETA.contorno, 3)
        .setDepth(100000)
        .setResolution(2)
        .setAlpha(0.95);
    }

    this.camara = instalarControles(this, { ancho: p.ancho * TILE, alto: p.alto * TILE });
    this.camara.ajustar();
    const quitar = bus.on('zona:ir', (tipo) => this.irAZona(tipo));
    this.events.once('shutdown', quitar);
    this.events.once('destroy', quitar);
  }

  /** Lleva la cámara a todas las zonas de ese tipo y resalta su rectángulo. */
  private irAZona(tipo: TipoZona): void {
    const zs = this.plano.zonas.filter((z) => z.tipo === tipo);
    if (!zs.length) return;
    const x0 = Math.min(...zs.map((z) => z.x)), y0 = Math.min(...zs.map((z) => z.y));
    const x1 = Math.max(...zs.map((z) => z.x + z.ancho)), y1 = Math.max(...zs.map((z) => z.y + z.alto));
    this.camara.irA({ x: x0 * TILE, y: y0 * TILE, ancho: (x1 - x0) * TILE, alto: (y1 - y0) * TILE });

    this.resalte?.destroy();
    const g = this.add.graphics().setDepth(200000);
    g.lineStyle(2, 0xf57c00, 1);
    for (const z of zs) g.strokeRect(z.x * TILE + 1, z.y * TILE + 1, z.ancho * TILE - 2, z.alto * TILE - 2);
    this.resalte = g;
    this.tweens.add({ targets: g, alpha: 0, delay: 1200, duration: 600, onComplete: () => g.destroy() });
  }
}
