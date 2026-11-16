import Phaser from 'phaser';
import { PALETA as P, TILE } from '../paleta';
import { DIMENSIONES, type ColorSilla } from './claves';

type Ctx = CanvasRenderingContext2D;

const r = (c: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};

/** Contorno de 1 px dentro del rectángulo. */
const marco = (c: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  r(c, x, y, w, 1, color);
  r(c, x, y + h - 1, w, 1, color);
  r(c, x, y, 1, h, color);
  r(c, x + w - 1, y, 1, h, color);
};

function lienzo(escena: Phaser.Scene, clave: string, w: number, h: number, dibujar: (c: Ctx) => void): void {
  if (escena.textures.exists(clave)) return;
  const t = escena.textures.createCanvas(clave, w, h);
  if (!t) throw new Error(`No se pudo crear la textura ${clave}`);
  dibujar(t.getContext());
  t.refresh();
}

const COLORES_SILLA: Record<ColorSilla | 'verde' | 'blanca', [string, string]> = {
  rojo: [P.rojo, P.rojoOscuro],
  gris: [P.gris, P.grisOscuro],
  naranja: [P.naranja, P.naranjaOscuro],
  verde: [P.verde, P.verdeOscuro],
  blanca: [P.blanco, P.borde],
};

type Lado = 'norte' | 'sur' | 'este' | 'oeste';

/** Silla vista desde arriba, de 8 × 8 px, con el respaldo en el lado indicado. */
function silla(c: Ctx, cx: number, cy: number, color: keyof typeof COLORES_SILLA, respaldo: Lado): void {
  const [base, oscuro] = COLORES_SILLA[color];
  const x = cx - 4, y = cy - 4;
  r(c, x + 1, y + 1, 6, 6, oscuro);
  r(c, x + 2, y + 2, 4, 4, base);
  r(c, x + 2, y + 2, 2, 1, P.blanco); // brillo
  if (respaldo === 'norte') r(c, x + 1, y, 6, 2, oscuro);
  if (respaldo === 'sur') r(c, x + 1, y + 6, 6, 2, oscuro);
  if (respaldo === 'oeste') r(c, x, y + 1, 2, 6, oscuro);
  if (respaldo === 'este') r(c, x + 6, y + 1, 2, 6, oscuro);
}

/** Tablero blanco con borde y sombra. */
function tablero(c: Ctx, x: number, y: number, w: number, h: number): void {
  r(c, x, y, w, h, P.borde);
  r(c, x + 1, y + 1, w - 2, h - 2, P.blanco);
  r(c, x + 1, y + h - 3, w - 2, 2, P.blancoSombra);
}

function pseudo(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function dibujarSuelo(escena: Phaser.Scene): void {
  for (let i = 0; i < 4; i++) {
    lienzo(escena, `suelo-${i}`, TILE, TILE, (c) => {
      r(c, 0, 0, TILE, TILE, P.suelo[i]!);
      r(c, 0, TILE - 1, TILE, 1, P.sueloLinea);
      r(c, TILE - 1, 0, 1, TILE, P.sueloLinea);
      for (let k = 0; k < 5; k++) {
        const x = Math.floor(pseudo(i * 10 + k) * 14), y = Math.floor(pseudo(i * 10 + k + 50) * 14);
        r(c, x, y, 1, 1, k % 2 ? '#b8e266' : '#8fc03a');
      }
    });
  }
  lienzo(escena, 'alfombra', TILE, TILE, (c) => {
    r(c, 0, 0, TILE, TILE, P.alfombra);
    for (let y = 0; y < TILE; y += 2) for (let x = (y / 2) % 2; x < TILE; x += 2) r(c, x, y, 1, 1, P.alfombraPunto);
  });
}

function dibujarMuros(escena: Phaser.Scene): void {
  const tapa = (c: Ctx, alto: number) => {
    r(c, 0, 0, TILE, alto, P.muroTapa);
    r(c, 0, 0, TILE, 1, P.muroLuz);
    r(c, 3, 4, 4, 1, P.muroLuz);
    r(c, 9, 8, 4, 1, P.muroLuz);
  };
  lienzo(escena, 'muro', TILE, TILE, (c) => tapa(c, TILE));
  lienzo(escena, 'muro-frente', TILE, TILE, (c) => {
    tapa(c, 12);
    r(c, 0, 12, TILE, 4, P.muroFrente);
    r(c, 0, 12, TILE, 1, P.muroSombra);
    r(c, 0, 15, TILE, 1, P.muroSombra);
  });
  lienzo(escena, 'ventana', TILE, TILE, (c) => {
    tapa(c, 12);
    r(c, 0, 12, TILE, 4, P.muroFrente);
    r(c, 0, 15, TILE, 1, P.muroSombra);
    r(c, 1, 3, 14, 8, P.blanco);
    r(c, 2, 4, 12, 6, P.cristal);
    r(c, 2, 4, 12, 1, P.cristalOscuro);
    r(c, 7, 4, 2, 6, P.blanco);
    r(c, 3, 6, 2, 1, P.blanco);
    r(c, 10, 8, 2, 1, P.blanco);
  });
  lienzo(escena, 'mampara', TILE, TILE, (c) => {
    c.globalAlpha = 0.5;
    r(c, 5, 0, 6, TILE, P.cristal);
    c.globalAlpha = 1;
    r(c, 5, 0, 1, TILE, P.blanco);
    r(c, 10, 0, 1, TILE, P.cristalOscuro);
    r(c, 7, 2, 1, 4, P.blanco);
    r(c, 8, 9, 1, 3, P.blanco);
  });
  lienzo(escena, 'estanteria', TILE, TILE, (c) => {
    tablero(c, 1, 2, 14, 12);
    r(c, 2, 3, 12, 6, P.blancoSombra);
    const cols = [P.rojo, P.rojoOscuro, P.rojo, P.rojo, P.rojoOscuro, P.rojo];
    cols.forEach((col, i) => r(c, 2 + i * 2, 3, 2, 6, col));
    r(c, 2, 9, 12, 1, P.borde);
  });
}

function dibujarMobiliario(escena: Phaser.Scene): void {
  const [W, H] = [TILE, TILE];
  const obj = (clave: string, tipo: keyof typeof DIMENSIONES, f: (c: Ctx, w: number, h: number) => void) => {
    const [a, b] = DIMENSIONES[tipo];
    lienzo(escena, clave, a * W, b * H, (c) => f(c, a * W, b * H));
  };

  (['rojo', 'gris', 'naranja'] as const).forEach((color) => {
    obj(`obj-escritorio-${color}`, 'escritorio', (c) => {
      tablero(c, 1, 1, 30, 10);
      r(c, 12, 3, 8, 5, P.pantalla);
      r(c, 13, 4, 6, 3, P.pantallaLuz);
      r(c, 15, 8, 2, 1, P.borde);
      r(c, 10, 9, 12, 1, P.blancoSombra);
      silla(c, 16, 12, color, 'sur');
    });
  });

  obj('obj-mesa', 'mesa', (c, w) => {
    tablero(c, 4, 8, w - 8, 16);
    for (let i = 0; i < 4; i++) {
      silla(c, 8 + i * 16, 4, 'verde', 'norte');
      silla(c, 8 + i * 16, 27, 'verde', 'sur');
    }
  });
  obj('obj-mesa4-naranja', 'mesa4', (c, w) => {
    tablero(c, 4, 8, w - 8, 16);
    for (const x of [24, 40]) { silla(c, x, 4, 'naranja', 'norte'); silla(c, x, 27, 'naranja', 'sur'); }
  });
  obj('obj-mesa4-isla', 'mesa4', (c, w) => {
    tablero(c, 4, 8, w - 8, 16);
    // al girar 90° en horario, la fila de arriba queda al este (gris) y la de abajo al oeste (roja)
    for (const x of [24, 40]) { silla(c, x, 4, 'gris', 'norte'); silla(c, x, 27, 'rojo', 'sur'); }
  });
  obj('obj-mesapeq', 'mesapeq', (c) => {
    tablero(c, 7, 7, 18, 18);
    silla(c, 16, 3, 'blanca', 'norte');
    silla(c, 16, 28, 'blanca', 'sur');
    silla(c, 3, 16, 'blanca', 'oeste');
    silla(c, 28, 16, 'blanca', 'este');
  });
  obj('obj-mesasola', 'mesasola', (c) => tablero(c, 1, 3, 30, 10));
  obj('obj-silla', 'silla', (c) => silla(c, 8, 8, 'blanca', 'norte'));

  obj('obj-sofa', 'sofa', (c) => {
    r(c, 1, 2, 30, 12, P.naranjaOscuro);
    r(c, 2, 3, 28, 4, P.naranja);
    r(c, 2, 7, 13, 6, P.naranjaClaro);
    r(c, 17, 7, 13, 6, P.naranjaClaro);
    r(c, 15, 7, 2, 6, P.naranjaOscuro);
    r(c, 1, 2, 2, 12, P.naranjaOscuro);
    r(c, 29, 2, 2, 12, P.naranjaOscuro);
  });
  obj('obj-planta', 'planta', (c) => {
    r(c, 5, 9, 6, 5, '#b5651d');
    r(c, 5, 9, 6, 1, '#8a4a12');
    r(c, 6, 2, 4, 8, P.verdeOscuro);
    r(c, 3, 4, 10, 4, P.verde);
    r(c, 4, 2, 3, 3, P.verde);
    r(c, 9, 2, 3, 3, P.verde);
    r(c, 7, 1, 2, 3, '#6fd08a');
  });
  obj('obj-nevera', 'nevera', (c) => {
    r(c, 2, 1, 12, 14, P.borde);
    r(c, 3, 2, 10, 12, P.blanco);
    r(c, 3, 8, 10, 1, P.borde);
    r(c, 3, 12, 10, 2, P.blancoSombra);
    r(c, 11, 4, 1, 3, P.gris);
    r(c, 11, 10, 1, 2, P.gris);
  });
  obj('obj-microondas', 'microondas', (c) => {
    r(c, 2, 5, 12, 8, P.contorno);
    r(c, 3, 6, 10, 6, P.blancoSombra);
    r(c, 4, 7, 6, 4, P.pantalla);
    r(c, 5, 8, 3, 2, P.pantallaLuz);
    r(c, 11, 7, 1, 1, P.naranja);
    r(c, 11, 9, 1, 1, P.verde);
  });
  obj('obj-agua', 'agua', (c) => {
    r(c, 4, 7, 8, 8, P.borde);
    r(c, 5, 8, 6, 6, P.blanco);
    r(c, 6, 1, 4, 6, '#4aa3df');
    r(c, 5, 2, 6, 4, '#6cc0f0');
    r(c, 7, 11, 2, 2, P.azul);
  });
  obj('obj-impresora', 'impresora', (c) => {
    r(c, 2, 5, 12, 9, P.borde);
    r(c, 3, 6, 10, 7, '#cfd4da');
    r(c, 4, 2, 8, 4, P.blanco);
    r(c, 4, 2, 8, 1, P.borde);
    r(c, 4, 10, 8, 2, P.blanco);
    r(c, 11, 7, 1, 1, P.verde);
  });
  obj('obj-tele', 'tele', (c) => {
    r(c, 2, 4, 28, 8, P.contorno);
    r(c, 3, 5, 26, 6, P.pantalla);
    r(c, 4, 6, 12, 2, P.pantallaLuz);
    r(c, 14, 12, 4, 2, P.grisOscuro);
  });
  obj('obj-futbolin', 'futbolin', (c) => {
    r(c, 1, 2, 30, 12, P.maderaOscura);
    r(c, 3, 4, 26, 8, '#3a8d48');
    r(c, 15, 4, 2, 8, '#d7efd5');
    r(c, 14, 7, 4, 2, '#d7efd5');
    for (const x of [6, 10, 21, 25]) r(c, x, 1, 1, 14, '#c9ced4');
    r(c, 5, 6, 3, 3, P.rojo); r(c, 9, 6, 3, 3, P.rojo);
    r(c, 20, 6, 3, 3, P.azul); r(c, 24, 6, 3, 3, P.azul);
  });
  obj('obj-patinete', 'patinete', (c) => {
    r(c, 2, 6, 4, 4, P.contorno);
    r(c, 26, 6, 4, 4, P.contorno);
    r(c, 6, 7, 18, 3, P.naranja);
    r(c, 6, 7, 18, 1, P.naranjaClaro);
    r(c, 24, 7, 4, 2, P.grisOscuro);
    r(c, 26, 3, 2, 10, P.grisOscuro);
  });
  obj('obj-bici', 'bici', (c) => {
    c.strokeStyle = P.contorno;
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(7, 8, 5, 2.5, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(25, 8, 5, 2.5, 0, 0, Math.PI * 2); c.stroke();
    r(c, 7, 7, 18, 2, P.azul);
    r(c, 11, 6, 6, 4, P.contorno);
    r(c, 23, 3, 2, 10, P.grisOscuro);
  });
  obj('obj-puerta', 'puerta', (c) => {
    r(c, 1, 1, 2, 14, '#8a5a2b');
    c.strokeStyle = P.maderaOscura;
    c.lineWidth = 1;
    c.beginPath(); c.arc(2, 14, 13, -Math.PI / 2, 0); c.stroke();
  });
  obj('obj-entrada', 'entrada', (c) => {
    r(c, 0, 0, 32, 16, P.naranjaOscuro);
    r(c, 1, 1, 30, 14, P.grisOscuro);
    r(c, 13, 4, 6, 2, P.naranja);
    r(c, 14, 6, 4, 2, P.naranja);
    r(c, 15, 8, 2, 2, P.naranja);
    r(c, 1, 11, 30, 1, P.naranja);
  });
}

/** Crea (una sola vez) todas las texturas pixel art de la oficina. */
export function generarTexturas(escena: Phaser.Scene): void {
  dibujarSuelo(escena);
  dibujarMuros(escena);
  dibujarMobiliario(escena);
}
