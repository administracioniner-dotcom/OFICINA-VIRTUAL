import Phaser from 'phaser';
import { mamparasVisibles, zonaEn, type Plano, type TipoZona, type Zona } from '../domain/plano';
import { bus } from '../state/bus';
import { instalarControles, type ControlCamara } from './camara/controles';
import { PALETA, TILE } from './paleta';
import { mascaraMuro } from './muros';
import { colocarRotulos } from './rotulos';
import logoIner from '../assets/logo-iner.png';
import { claveMuro, texturaObjeto } from './texturas/claves';
import { generarTexturas } from './texturas/registro';

export class OfficeScene extends Phaser.Scene {
  private camara!: ControlCamara;
  private resalte?: Phaser.GameObjects.Graphics;

  constructor(private readonly plano: Plano) {
    super('oficina');
  }

  preload(): void {
    this.load.image('logo-iner', logoIner);
  }

  create(): void {
    generarTexturas(this);
    const p = this.plano;

    const enDireccion = (x: number, y: number) => zonaEn(p, x, y)?.tipo === 'direccion';

    // Suelo: verde limón con variación; alfombra gris en Dirección.
    // Se pinta una sola vez en una textura para no dibujar 740 baldosas en cada fotograma.
    const suelo = this.add.renderTexture(0, 0, p.ancho * TILE, p.alto * TILE).setOrigin(0).setDepth(0);
    for (let y = 0; y < p.alto; y++) {
      for (let x = 0; x < p.ancho; x++) {
        // damero suave (0/1) con alguna baldosa distinta (2/3) para que no se vea plano
        const azar = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        const variante = azar % 9 === 0 ? 2 + (azar % 2) : (x + y) % 2;
        suelo.draw(enDireccion(x, y) ? 'alfombra' : `suelo-${variante}`, x * TILE, y * TILE);
      }
    }

    // Borde de la alfombra de Dirección
    const alfombra = p.zonas.find((z) => z.tipo === 'direccion');
    if (alfombra) {
      const ga = this.add.graphics().setDepth(0.5);
      const x = alfombra.x * TILE, y = alfombra.y * TILE, w = alfombra.ancho * TILE, h = alfombra.alto * TILE;
      ga.lineStyle(4, 0x7f8691, 1); ga.strokeRect(x + 6, y + 6, w - 12, h - 12);
      ga.lineStyle(2, 0xc3c8d0, 1); ga.strokeRect(x + 12, y + 12, w - 24, h - 24);
      ga.fillStyle(0x8c94a0, 1);
      for (let d = 36; d < w - 36; d += 24) for (const yy of [y + 9, y + h - 9]) ga.fillRect(x + d - 2, yy - 2, 4, 4);
      for (let d = 36; d < h - 36; d += 24) for (const xx of [x + 9, x + w - 9]) ga.fillRect(xx - 2, y + d - 2, 4, 4);
    }

    // Muros, ventanas y mamparas (3/4: borde y cara frontal según las baldosas vecinas)
    for (const [x, y] of p.muros) {
      const mascara = mascaraMuro(p, x, y);
      this.add.image(x * TILE, y * TILE, claveMuro(mascara)).setOrigin(0).setDepth((y + 1) * TILE);
      if (mascara & 4 && y + 1 < p.alto) this.add.image(x * TILE, (y + 1) * TILE, 'sombra-muro').setOrigin(0).setDepth(0.6);
    }
    for (const [x, y] of p.ventanas) this.add.image(x * TILE, y * TILE, 'ventana').setOrigin(0).setDepth((y + 1) * TILE);
    for (const [x, y] of mamparasVisibles(p)) this.add.image(x * TILE, y * TILE, 'mampara').setOrigin(0).setDepth((y + 1) * TILE);
    for (const [x, y] of p.estanterias) {
      this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'estanteria').setAngle(90).setDepth((y + 1) * TILE);
    }

    // Logotipo de INER en el muro de Dirección, justo encima del televisor
    const tele = p.objetos.find((o) => o.tipo === 'tele' && zonaEn(p, o.x, o.y)?.tipo === 'direccion');
    if (tele) {
      const cx = (tele.x + tele.ancho / 2) * TILE, y = (tele.y - 1) * TILE;
      const placa = this.add.graphics().setDepth(tele.y * TILE + 1);
      placa.fillStyle(0x232733, 1).fillRect(cx - 49, y + 1, 98, 30);
      placa.fillStyle(0xfbfaf6, 1).fillRect(cx - 48, y + 2, 96, 28);
      this.add.image(cx, y + 16, 'logo-iner').setDepth(tele.y * TILE + 2);
    }

    // Objetos (el microondas va encima de su soporte)
    for (const o of p.objetos) {
      const zona = zonaEn(p, o.x, o.y)?.tipo;
      const suelo = o.tipo === 'entrada' || o.tipo === 'puerta';
      const profundidad = suelo ? 1 : (o.y + o.alto) * TILE + (o.sobre ? 1 : 0);
      const { clave, angulo } = texturaObjeto(o, zona);
      this.add
        .image((o.x + o.ancho / 2) * TILE, (o.y + o.alto / 2) * TILE, clave)
        .setAngle(angulo)
        .setDepth(profundidad);
    }

    // Zonas: línea tenue de borde (con un pequeño margen entre vecinas) y rótulo
    const g = this.add.graphics().setDepth(2);
    for (const z of p.zonas) {
      g.lineStyle(2, 0x2a2e37, 0.45);
      g.strokeRect(z.x * TILE + 5, z.y * TILE + 5, z.ancho * TILE - 10, z.alto * TILE - 10);
    }
    for (const r of colocarRotulos(p)) {
      this.add
        .text(r.x, r.y, r.lineas.join('\n'), {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: `${TILE / 2}px`,
          color: PALETA.blanco,
          lineSpacing: TILE / 8,
        })
        .setStroke(PALETA.contorno, TILE / 5)
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
    g.lineStyle(4, 0xf57c00, 1);
    for (const z of zs) g.strokeRect(z.x * TILE + 2, z.y * TILE + 2, z.ancho * TILE - 4, z.alto * TILE - 4);
    this.resalte = g;
    this.tweens.add({ targets: g, alpha: 0, delay: 1200, duration: 600, onComplete: () => g.destroy() });
  }
}
