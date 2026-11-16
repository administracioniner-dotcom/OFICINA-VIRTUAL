import Phaser from 'phaser';
import { TILE } from '../paleta';
import { DIMENSIONES, type ColorSilla } from './claves';

/*
 * Pixel art dibujado por código a 32 px por baldosa.
 * Estilo: contorno oscuro de 1 px, sombreado en tres tonos (luz, base, sombra) y sombra suave en el suelo.
 */

type Ctx = CanvasRenderingContext2D;
type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

const C = {
  contorno: '#232733',
  sombra: 'rgba(20, 24, 12, 0.28)',
  blanco: '#f7f8fa', blancoLuz: '#ffffff', blancoSombra: '#c9cfd9', blancoOscuro: '#9aa3b2',
  madera: '#c08a5a', maderaLuz: '#dba878', maderaOscura: '#7a5231',
  pantalla: '#1b2230', azulPantalla: '#4f86c6', verdePantalla: '#58c68a', naranja: '#f57c00',
  metal: '#c9ced6', metalLuz: '#e6e9ee', metalOscuro: '#8a93a1',
  verdeHoja: '#4aa05a', verdeHojaLuz: '#7ccf85', verdeHojaOscuro: '#2f6e3d',
  terracota: '#c4703a', terracotaLuz: '#e08f55', terracotaOscura: '#8a4a22',
  cristal: '#bfe6f5', cristalLuz: '#eaf8ff', cristalOscuro: '#7fb8d1',
  rojo: '#d6403a', rojoLuz: '#f0675f', rojoOscuro: '#8e2420',
  azul: '#3b6ea5',
} as const;

/** [base, luz, sombra] de cada color de silla. */
const SILLA: Record<ColorSilla | 'verde' | 'blanca', readonly [string, string, string]> = {
  rojo: ['#d6403a', '#f0675f', '#8e2420'],
  gris: ['#808897', '#a9b0bd', '#4d5461'],
  naranja: ['#f57c00', '#ffa84d', '#a84f00'],
  verde: ['#3fae5a', '#6fd08a', '#237040'],
  blanca: ['#f4f5f7', '#ffffff', '#aab1bd'],
};

const rectCtx = (c: Ctx): Rect => (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

/** Caja con esquinas cortadas, contorno, luz arriba-izquierda y sombra abajo-derecha. */
function caja(r: Rect, x: number, y: number, w: number, h: number, relleno: string, luz?: string, sombra?: string, borde: string = C.contorno): void {
  r(x + 1, y, w - 2, 1, borde); r(x + 1, y + h - 1, w - 2, 1, borde);
  r(x, y + 1, 1, h - 2, borde); r(x + w - 1, y + 1, 1, h - 2, borde);
  r(x + 1, y + 1, w - 2, h - 2, relleno);
  if (luz) { r(x + 1, y + 1, w - 3, 1, luz); r(x + 1, y + 2, 1, h - 4, luz); }
  if (sombra) { r(x + 2, y + h - 2, w - 3, 1, sombra); r(x + w - 2, y + 2, 1, h - 4, sombra); }
}

function disco(c: Ctx, cx: number, cy: number, rad: number, color: string): void {
  c.fillStyle = color;
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + rad * 0.6) c.fillRect(cx + x, cy + y, 1, 1);
}

function elipse(c: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  c.fillStyle = color;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) c.fillRect(cx + x, cy + y, 1, 1);
}

/** Sombra suave bajo un objeto. */
const sombraSuelo = (c: Ctx, x: number, y: number, w: number, h: number) => { c.fillStyle = C.sombra; c.fillRect(x + 1, y + 2, w, h); };

function lienzo(escena: Phaser.Scene, clave: string, w: number, h: number, dibujar: (c: Ctx) => void): void {
  if (escena.textures.exists(clave)) return;
  const t = escena.textures.createCanvas(clave, w, h);
  if (!t) throw new Error(`No se pudo crear la textura ${clave}`);
  const ctx = t.getContext();
  ctx.imageSmoothingEnabled = false;
  dibujar(ctx);
  t.refresh();
}

function pseudo(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/* ---------- Silla ergonómica (vista desde arriba, con rotación exacta de 90°) ---------- */
type Lado = 'norte' | 'sur' | 'este' | 'oeste';
const GIROS: Record<Lado, number> = { norte: 0, este: 1, sur: 2, oeste: 3 };

function silla(c: Ctx, cx: number, cy: number, color: keyof typeof SILLA, respaldo: Lado): void {
  const k = GIROS[respaldo];
  const [base, luz, osc] = SILLA[color];
  // rect en coordenadas locales (respaldo al norte) → mundo, girando k × 90° en horario
  const rot = (x: number, y: number): [number, number] => (k === 0 ? [x, y] : k === 1 ? [-y, x] : k === 2 ? [-x, -y] : [y, -x]);
  const rect: Rect = (x, y, w, h, color2) => {
    const [x1, y1] = rot(x, y), [x2, y2] = rot(x + w, y + h);
    c.fillStyle = color2;
    c.fillRect(cx + Math.min(x1, x2), cy + Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  };
  // sombra en el suelo (no gira con la silla)
  c.fillStyle = C.sombra;
  c.fillRect(cx - 6, cy - 4, 14, 13);
  // base de ruedas
  for (const [x, y] of [[-6, 5], [5, 5], [-3, 8], [2, 8]] as const) rect(x, y, 2, 2, C.contorno);
  // brazos
  rect(-8, -3, 2, 8, C.contorno); rect(6, -3, 2, 8, C.contorno);
  rect(-7, -2, 1, 6, osc); rect(6, -2, 1, 6, osc);
  // asiento
  caja(rect, -6, -4, 12, 11, base, luz, osc);
  rect(-3, -1, 6, 1, luz);
  // respaldo
  caja(rect, -7, -9, 14, 5, base, luz, osc);
  rect(-4, -8, 8, 1, luz);
}

/* ---------- Superficies ---------- */
/** Tablero blanco con borde, brillo y canto sombreado. */
function tablero(r: Rect, x: number, y: number, w: number, h: number): void {
  caja(r, x, y, w, h, C.blanco, C.blancoLuz, C.blancoSombra);
  r(x + 2, y + h - 3, w - 4, 1, C.blancoSombra);
  r(x + 4, y + 3, Math.max(0, w - 12), 1, C.blancoLuz);
}

function monitor(r: Rect, x: number, y: number): void {
  r(x + 4, y + 9, 6, 2, C.metalOscuro); // pie
  caja(r, x, y, 14, 9, C.pantalla, undefined, undefined, C.contorno);
  r(x + 2, y + 2, 10, 5, '#223049');
  r(x + 2, y + 2, 6, 1, C.azulPantalla);
  r(x + 2, y + 4, 8, 1, C.verdePantalla);
  r(x + 2, y + 6, 4, 1, C.naranja);
}

function teclado(r: Rect, x: number, y: number): void {
  caja(r, x, y, 15, 5, C.metalLuz, C.blancoLuz, C.metal);
  for (let i = 0; i < 6; i++) r(x + 2 + i * 2, y + 2, 1, 1, C.metalOscuro);
}

/* ---------- Suelo y muros ---------- */
function dibujarSuelo(escena: Phaser.Scene): void {
  const bases = ['#a6d548', '#a1d144', '#abd94d', '#9dce41'];
  for (let i = 0; i < 4; i++) {
    lienzo(escena, `suelo-${i}`, TILE, TILE, (c) => {
      const r = rectCtx(c);
      r(0, 0, TILE, TILE, bases[i]!);
      r(0, TILE - 1, TILE, 1, '#8fbd3d');
      r(TILE - 1, 0, 1, TILE, '#8fbd3d');
      r(0, 0, TILE - 1, 1, '#b4e060');
      r(0, 1, 1, TILE - 2, '#b4e060');
      for (let k = 0; k < 7; k++) {
        const x = 2 + Math.floor(pseudo(i * 17 + k) * 26), y = 2 + Math.floor(pseudo(i * 17 + k + 40) * 26);
        r(x, y, k % 3 === 0 ? 2 : 1, 1, k % 2 ? '#b9e467' : '#90c03d');
      }
    });
  }
  lienzo(escena, 'alfombra', TILE, TILE, (c) => {
    const r = rectCtx(c);
    r(0, 0, TILE, TILE, '#a4aab3');
    for (let y = 0; y < TILE; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < TILE; x += 4) r(x, y, 1, 1, '#959ca6');
    for (let y = 1; y < TILE; y += 8) r(0, y, TILE, 1, '#adb3bc');
  });
}

/** Pared: tapa crema con borde oscuro; si el sur está abierto, cara frontal con zócalo. */
function muro(c: Ctx, mascara: number): void {
  const r = rectCtx(c);
  const N = mascara & 1, E = mascara & 2, S = mascara & 4, O = mascara & 8;
  const tapa = S ? 22 : TILE;
  r(0, 0, TILE, tapa, '#ebe7de');
  for (let y = 5; y < tapa; y += 8) r(0, y, TILE, 1, '#e0dcd1');
  r(0, 1, TILE, 1, '#f8f6f1');
  if (N) r(0, 0, TILE, 2, C.contorno);
  if (S) {
    r(0, 22, TILE, 10, '#bfc6d3');       // cara frontal
    r(0, 22, TILE, 1, C.blancoLuz);      // moldura
    r(0, 23, TILE, 1, '#9da6b5');
    r(0, 28, TILE, 3, '#7b5a3c');        // zócalo de madera
    r(0, 28, TILE, 1, '#9b7752');
    r(0, 31, TILE, 1, C.contorno);
    r(0, 21, TILE, 1, '#a9b0be');
  }
  const alto = S ? TILE : tapa;
  if (E) r(TILE - 2, 0, 2, alto, C.contorno);
  if (O) r(0, 0, 2, alto, C.contorno);
}

function dibujarMuros(escena: Phaser.Scene): void {
  for (let m = 0; m < 16; m++) lienzo(escena, `muro-${m}`, TILE, TILE, (c) => muro(c, m));

  lienzo(escena, 'ventana', TILE, TILE, (c) => {
    muro(c, 1 | 4);
    const r = rectCtx(c);
    caja(r, 3, 4, 26, 16, C.cristal, C.cristalLuz, C.cristalOscuro, C.contorno);
    r(4, 5, 24, 1, C.blancoLuz);
    r(15, 5, 2, 14, C.blanco); r(15, 5, 1, 14, C.blancoLuz);
    r(5, 7, 4, 1, C.cristalLuz); r(6, 8, 3, 1, C.cristalLuz);
    r(19, 12, 5, 1, C.cristalLuz); r(20, 13, 3, 1, C.cristalLuz);
    r(2, 20, 28, 2, C.blancoSombra); // alféizar
    r(2, 20, 28, 1, C.blancoLuz);
  });

  lienzo(escena, 'mampara', TILE, TILE, (c) => {
    const r = rectCtx(c);
    c.globalAlpha = 0.55;
    r(11, 0, 10, TILE, C.cristal);
    c.globalAlpha = 1;
    r(10, 0, 1, TILE, C.contorno); r(21, 0, 1, TILE, C.contorno);
    r(11, 0, 1, TILE, C.blancoLuz); r(20, 0, 1, TILE, C.cristalOscuro);
    for (const [y, h] of [[3, 6], [14, 4], [22, 6]] as const) { r(13, y, 1, h, C.blancoLuz); r(14, y + 1, 1, h - 2, C.cristalLuz); }
  });

  lienzo(escena, 'estanteria', TILE, TILE, (c) => {
    const r = rectCtx(c);
    sombraSuelo(c, 3, 6, 28, 22);
    caja(r, 2, 4, 28, 24, C.blanco, C.blancoLuz, C.blancoSombra);
    r(4, 6, 24, 12, C.blancoSombra);
    r(4, 6, 24, 1, C.blancoOscuro);
    const alturas = [10, 11, 9, 11, 10, 11, 9, 10, 11, 10, 9];
    alturas.forEach((h, i) => {
      const x = 5 + i * 2;
      r(x, 18 - h, 2, h, i % 3 === 1 ? C.rojoOscuro : C.rojo);
      r(x, 18 - h, 1, h, i % 3 === 1 ? C.rojo : C.rojoLuz);
      r(x, 18 - h, 2, 1, C.contorno);
      if (i % 2 === 0) r(x, 18 - h + 2, 2, 1, C.blancoLuz);
    });
    r(4, 18, 24, 1, C.blancoOscuro);
    r(4, 19, 24, 7, C.blanco);
    r(4, 24, 24, 1, C.blancoSombra);
    r(13, 21, 6, 1, C.blancoOscuro); // tirador
  });
}

/* ---------- Mobiliario ---------- */
function dibujarMobiliario(escena: Phaser.Scene): void {
  const obj = (clave: string, tipo: keyof typeof DIMENSIONES, f: (c: Ctx, r: Rect, w: number, h: number) => void) => {
    const [a, b] = DIMENSIONES[tipo];
    lienzo(escena, clave, a * TILE, b * TILE, (c) => f(c, rectCtx(c), a * TILE, b * TILE));
  };
  const papeles = (r: Rect, x: number, y: number) => {
    r(x, y, 9, 11, C.contorno); r(x + 1, y + 1, 7, 9, C.blancoLuz);
    for (const dy of [2, 4, 6, 8]) r(x + 2, y + dy, 5, 1, C.blancoOscuro);
  };
  const taza = (c: Ctx, x: number, y: number) => {
    disco(c, x, y, 4, C.contorno); disco(c, x, y, 3, C.naranja); disco(c, x - 1, y - 1, 1, '#ffc07a'); disco(c, x, y, 1, '#5a2e00');
  };

  // Escritorio blanco con la silla integrada (color según el departamento)
  (['rojo', 'gris', 'naranja'] as const).forEach((color) => {
    obj(`obj-escritorio-${color}`, 'escritorio', (c, r) => {
      silla(c, 32, 24, color, 'sur');
      sombraSuelo(c, 3, 4, 60, 20);
      tablero(r, 2, 3, 60, 21);
      monitor(r, 25, 6);
      teclado(r, 24, 17);
      papeles(r, 6, 7);
      taza(c, 52, 12);
      r(43, 17, 3, 5, C.contorno); r(44, 18, 1, 3, C.metalLuz); // ratón
    });
  });

  const sillasMesa = (c: Ctx, w: number, h: number, xs: number[], color: keyof typeof SILLA) => {
    for (const x of xs) { silla(c, x, 9, color, 'norte'); silla(c, x, h - 10, color, 'sur'); }
    void w;
  };
  const objetosMesa = (c: Ctx, r: Rect, w: number, h: number) => {
    const cx = w / 2, cy = h / 2;
    papeles(r, cx - 28, cy - 5); papeles(r, cx + 18, cy - 5);
    caja(r, cx - 9, cy - 5, 18, 10, '#2b3240', C.metalLuz, undefined); r(cx - 7, cy - 3, 14, 6, '#3b6ea5'); // portátil
    taza(c, cx + 12, cy + 1);
  };

  obj('obj-mesa', 'mesa', (c, r, w, h) => {
    sillasMesa(c, w, h, [16, 48, 80, 112], 'verde');
    sombraSuelo(c, 9, 18, w - 14, h - 34);
    tablero(r, 8, 16, w - 16, h - 32);
    objetosMesa(c, r, w, h);
  });
  obj('obj-mesa4-naranja', 'mesa4', (c, r, w, h) => {
    sillasMesa(c, w, h, [48, 80], 'naranja');
    sombraSuelo(c, 9, 18, w - 14, h - 34);
    tablero(r, 8, 16, w - 16, h - 32);
    objetosMesa(c, r, w, h);
  });
  obj('obj-mesa4-isla', 'mesa4', (c, r, w, h) => {
    // al girar 90° en horario, la fila de arriba queda al este (gris) y la de abajo al oeste (roja)
    for (const x of [48, 80]) { silla(c, x, 9, 'gris', 'norte'); silla(c, x, h - 10, 'rojo', 'sur'); }
    sombraSuelo(c, 9, 18, w - 14, h - 34);
    tablero(r, 8, 16, w - 16, h - 32);
    objetosMesa(c, r, w, h);
  });
  obj('obj-mesapeq', 'mesapeq', (c, r) => {
    silla(c, 32, 9, 'blanca', 'norte'); silla(c, 32, 55, 'blanca', 'sur');
    silla(c, 9, 32, 'blanca', 'oeste'); silla(c, 55, 32, 'blanca', 'este');
    sombraSuelo(c, 15, 15, 36, 36);
    tablero(r, 14, 14, 36, 36);
    taza(c, 32, 32); disco(c, 22, 24, 2, C.verdeHoja); papeles(r, 36, 20);
  });
  obj('obj-mesasola', 'mesasola', (c, r) => {
    sombraSuelo(c, 3, 5, 60, 22);
    tablero(r, 2, 4, 60, 22);
    papeles(r, 6, 9);
    taza(c, 50, 15);
  });
  obj('obj-silla', 'silla', (c) => silla(c, 16, 16, 'blanca', 'norte'));

  obj('obj-sofa', 'sofa', (c, r) => {
    sombraSuelo(c, 3, 5, 60, 25);
    caja(r, 2, 3, 60, 26, '#e0770f', '#ffa040', '#a84f00');       // cuerpo
    caja(r, 2, 3, 60, 9, '#c26308', '#e68527', '#8a4504');         // respaldo
    caja(r, 8, 13, 22, 14, '#f58f2c', '#ffb866', '#b85a00');       // cojín izquierdo
    caja(r, 34, 13, 22, 14, '#f58f2c', '#ffb866', '#b85a00');      // cojín derecho
    caja(r, 2, 9, 7, 20, '#c26308', '#e68527', '#8a4504');         // brazo izquierdo
    caja(r, 55, 9, 7, 20, '#c26308', '#e68527', '#8a4504');        // brazo derecho
    r(12, 7, 16, 1, '#e68527'); r(36, 7, 16, 1, '#e68527');
  });

  obj('obj-planta', 'planta', (c, r) => {
    sombraSuelo(c, 9, 20, 16, 9);
    // maceta
    caja(r, 9, 19, 14, 11, C.terracota, C.terracotaLuz, C.terracotaOscura);
    r(8, 17, 16, 4, C.contorno); r(9, 18, 14, 2, C.terracotaLuz); r(10, 20, 12, 1, C.terracotaOscura);
    r(10, 17, 12, 1, '#4a3320');
    // hojas
    const hoja = (ang: number, largo: number) => {
      const dx = Math.cos(ang), dy = Math.sin(ang);
      for (const [rad, col] of [[4, C.contorno], [3, C.verdeHojaOscuro]] as const) {
        for (let t = 0; t <= largo; t += 1) disco(c, Math.round(16 + dx * t), Math.round(13 + dy * t), Math.max(1, Math.round(rad * (1 - t / (largo * 1.4)))), col);
      }
    };
    const hojas: Array<[number, number]> = [[-2.4, 11], [-0.7, 11], [-1.57, 12], [0.4, 9], [-3.5, 9], [2.7, 8], [1.1, 7]];
    for (const [a, l] of hojas) hoja(a, l);
    for (const [a, l] of hojas) {
      const dx = Math.cos(a), dy = Math.sin(a);
      for (let t = 2; t <= l - 2; t++) disco(c, Math.round(16 + dx * t), Math.round(13 + dy * t - 1), 1, t % 2 ? C.verdeHoja : C.verdeHojaLuz);
    }
    disco(c, 16, 14, 2, C.verdeHojaOscuro);
  });

  obj('obj-nevera', 'nevera', (c, r) => {
    sombraSuelo(c, 5, 4, 24, 27);
    caja(r, 4, 2, 24, 28, C.blanco, C.blancoLuz, C.blancoSombra);
    r(5, 12, 22, 2, C.blancoOscuro); r(5, 12, 22, 1, C.contorno);  // separación de puertas
    r(23, 6, 2, 4, C.contorno); r(23, 16, 2, 8, C.contorno);        // tiradores
    r(23, 6, 1, 4, C.metalLuz); r(23, 16, 1, 8, C.metalLuz);
    r(8, 17, 5, 5, '#ffe08a'); r(9, 18, 3, 1, C.contorno);          // nota con imán
    disco(c, 10, 22, 1, C.rojo);
  });
  obj('obj-microondas', 'microondas', (c, r) => {
    sombraSuelo(c, 4, 11, 26, 17);
    caja(r, 3, 9, 26, 18, C.metal, C.metalLuz, C.metalOscuro);
    caja(r, 5, 11, 15, 13, '#161b24', undefined, undefined);
    r(6, 12, 13, 11, '#2a2f3a'); r(8, 14, 9, 7, '#a85a12'); r(9, 15, 7, 5, '#f5a23b');  // luz del interior
    r(6, 12, 13, 1, '#4a5160');
    caja(r, 22, 11, 5, 13, '#4a5160', '#6b7384', '#2c313b');
    r(23, 13, 3, 2, C.verdePantalla); r(23, 17, 3, 1, C.naranja); r(23, 20, 3, 1, C.naranja);
  });
  obj('obj-agua', 'agua', (c, r) => {
    sombraSuelo(c, 7, 14, 20, 17);
    caja(r, 6, 14, 20, 16, C.blanco, C.blancoLuz, C.blancoSombra);
    r(8, 17, 16, 5, '#dbe3ee'); r(14, 19, 4, 3, C.azul); r(14, 22, 4, 1, C.contorno);
    r(8, 26, 16, 2, C.blancoOscuro);
    disco(c, 16, 8, 9, C.contorno); disco(c, 16, 8, 8, '#4aa3df'); disco(c, 16, 8, 6, '#6cc0f0'); disco(c, 13, 5, 2, '#d8f2ff');
    r(14, 15, 4, 2, C.contorno);
  });
  obj('obj-impresora', 'impresora', (c, r) => {
    sombraSuelo(c, 4, 10, 26, 20);
    r(8, 2, 16, 10, C.contorno); r(9, 3, 14, 9, C.blancoLuz);                      // bandeja con papel
    for (const dy of [5, 7, 9]) r(11, dy, 10, 1, C.blancoOscuro);
    caja(r, 3, 9, 26, 20, '#d4d9e0', C.blancoLuz, C.metalOscuro);
    r(7, 21, 18, 4, '#7b8492'); r(7, 21, 18, 1, C.contorno);                       // ranura de salida
    caja(r, 21, 12, 6, 5, '#2b3240', undefined, undefined);
    r(23, 14, 1, 1, '#58c68a'); r(25, 14, 1, 1, C.naranja);
  });
  obj('obj-tele', 'tele', (c, r) => {
    sombraSuelo(c, 4, 12, 58, 18);
    caja(r, 3, 6, 58, 20, '#11151c', '#2b3140', undefined);
    r(5, 8, 54, 16, '#16263a');
    // imagen: gráfico de barras y línea
    r(9, 18, 4, 4, C.azulPantalla); r(15, 14, 4, 8, C.verdePantalla); r(21, 16, 4, 6, C.azulPantalla);
    r(27, 11, 4, 11, C.verdePantalla); r(33, 13, 4, 9, C.azulPantalla); r(39, 10, 4, 12, C.naranja);
    r(45, 12, 4, 10, C.verdePantalla);
    r(8, 22, 44, 1, '#3a5a80');
    r(6, 9, 20, 1, '#2f4f78'); r(8, 10, 14, 1, '#2f4f78');
    for (let i = 0; i < 6; i++) r(48 + i, 8 + i, 1, 1, '#4a6a94');                // reflejo
    r(24, 26, 16, 3, C.contorno); r(26, 27, 12, 1, C.metalOscuro);
  });
  obj('obj-futbolin', 'futbolin', (c, r) => {
    sombraSuelo(c, 3, 8, 60, 22);
    caja(r, 2, 4, 60, 24, '#8a5a2b', '#b07b43', '#5e3b18');
    r(7, 8, 50, 16, '#2f8a43'); r(7, 8, 50, 1, C.contorno); r(7, 23, 50, 1, C.contorno);
    for (let x = 7; x < 57; x += 10) r(x, 9, 5, 14, '#369a4b');                    // franjas del césped
    r(31, 9, 2, 14, '#e6f4e6'); disco(c, 32, 16, 4, '#e6f4e6'); disco(c, 32, 16, 3, '#2f8a43');
    r(7, 12, 3, 8, '#1a1f28'); r(54, 12, 3, 8, '#1a1f28');                            // porterías
    for (const x of [14, 22, 42, 50]) {
      r(x, 3, 2, 26, '#c9ced6'); r(x, 3, 1, 26, '#eef1f5');
      r(x - 1, 1, 4, 3, C.contorno); r(x - 1, 28, 4, 3, C.contorno);                // mangos
    }
    for (const [x, col] of [[12, C.rojo], [20, C.rojo], [40, C.azul], [48, C.azul]] as const) {
      r(x, 10, 6, 4, C.contorno); r(x + 1, 11, 4, 2, col);
      r(x, 18, 6, 4, C.contorno); r(x + 1, 19, 4, 2, col);
    }
    disco(c, 30, 15, 1, C.blancoLuz);
  });
  obj('obj-patinete', 'patinete', (c, r) => {
    sombraSuelo(c, 5, 13, 52, 12);
    // ruedas
    caja(r, 4, 11, 10, 10, '#1b1f27', '#3b4250', undefined); disco(c, 9, 16, 2, C.metalOscuro);
    caja(r, 50, 11, 10, 10, '#1b1f27', '#3b4250', undefined); disco(c, 55, 16, 2, C.metalOscuro);
    // plataforma
    caja(r, 10, 12, 36, 8, '#f57c00', '#ffa84d', '#a84f00');
    for (let x = 14; x < 42; x += 4) { r(x, 15, 2, 1, '#a84f00'); r(x + 2, 17, 2, 1, '#a84f00'); }
    // barra y manillar
    r(44, 15, 10, 2, C.contorno); r(45, 15, 8, 1, C.metalLuz);
    r(52, 4, 4, 24, C.contorno); r(53, 5, 2, 22, C.metal);
    caja(r, 51, 2, 6, 5, '#1b1f27', '#3b4250', undefined); caja(r, 51, 25, 6, 5, '#1b1f27', '#3b4250', undefined);
  });
  obj('obj-bici', 'bici', (c, r) => {
    sombraSuelo(c, 5, 11, 54, 14);
    // ruedas (vistas casi de canto desde arriba)
    for (const x of [14, 50]) {
      for (const [rx, ry, col] of [[10, 4, C.contorno], [9, 3, '#383f4d'], [8, 2, '#10141b']] as const) elipse(c, x, 16, rx, ry, col);
      r(x - 1, 15, 3, 2, C.metalLuz);
    }
    // cuadro
    r(14, 14, 36, 5, C.contorno); r(15, 15, 34, 3, C.azul); r(15, 15, 34, 1, '#6aa0d6');
    r(24, 12, 12, 9, C.contorno); r(25, 13, 10, 7, '#2f5c91');
    // sillín, manillar y cadena
    elipse(c, 20, 16, 5, 3, C.contorno); elipse(c, 20, 16, 4, 2, '#20242c'); r(17, 15, 2, 1, '#4a5160');
    r(47, 4, 4, 24, C.contorno); r(48, 5, 2, 22, C.metal);
    caja(r, 46, 2, 6, 4, '#1b1f27', '#3b4250', undefined); caja(r, 46, 26, 6, 4, '#1b1f27', '#3b4250', undefined);
    r(28, 22, 4, 2, C.contorno); r(28, 8, 4, 2, C.contorno);                         // pedales
  });
  obj('obj-puerta', 'puerta', (c, r) => {
    r(2, 2, 4, 28, C.contorno); r(3, 3, 2, 26, '#8a5a2b');
    for (let i = 0; i < 24; i++) { const rad = 26; const x = Math.round(4 + Math.cos((i / 23) * (Math.PI / 2)) * rad * 0 + (i / 23) * 24); const y = Math.round(29 - Math.sin((i / 23) * (Math.PI / 2)) * 26); c.fillStyle = C.maderaOscura; c.fillRect(x, y, 1, 1); }
  });
  obj('obj-entrada', 'entrada', (c, r) => {
    caja(r, 1, 3, 62, 26, '#d96b00', '#ff9a33', '#a84f00');
    r(4, 6, 56, 20, '#47505f'); r(4, 6, 56, 1, '#2c313b');
    for (let y = 8; y < 24; y += 3) for (let x = 6 + ((y / 3) % 2) * 2; x < 58; x += 4) r(x, y, 1, 1, '#59637a');
    // dos flechas hacia abajo (hacia dentro)
    for (const cx of [20, 44]) {
      for (let i = 0; i < 5; i++) { r(cx - 7 + i, 9 + i, 2, 2, C.naranja); r(cx + 5 - i, 9 + i, 2, 2, C.naranja); }
      for (let i = 0; i < 5; i++) { r(cx - 7 + i, 16 + i, 2, 2, '#ffa84d'); r(cx + 5 - i, 16 + i, 2, 2, '#ffa84d'); }
    }
    void c;
  });
}

/** Crea (una sola vez) todas las texturas pixel art de la oficina. */
export function generarTexturas(escena: Phaser.Scene): void {
  dibujarSuelo(escena);
  dibujarMuros(escena);
  dibujarMobiliario(escena);
}
