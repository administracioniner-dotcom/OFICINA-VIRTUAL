/*
 * Personajes en pixel art, dibujados por código en un fotograma de 24 × 32 px (pies abajo, centrados).
 * Cuatro direcciones; caminar de 4 fotogramas; y pose sentada para los puestos de trabajo.
 */

export type Direccion = 'sur' | 'norte' | 'este' | 'oeste';

export interface AspectoPersonaje {
  piel: string;
  pelo: string;
  estilo: 0 | 1 | 2 | 3;   // 0 corto · 1 melena · 2 moño · 3 rapado
  camisa: string;
  camisaOscura: string;
  pantalon: string;
}

export const ANCHO_FOTOGRAMA = 24;
export const ALTO_FOTOGRAMA = 32;

const PIELES = ['#f1c9a5', '#e0a97c', '#c68a5b', '#8d5a3b'] as const;
const PELOS = ['#2b2118', '#5a3b22', '#b5651d', '#e6c15a', '#8a8f98', '#c0392b'] as const;
const CONTORNO = '#232733';

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

/** Oscurece un color #rrggbb un porcentaje (0–1). */
export function oscurecer(hex: string, f = 0.25): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.round(v * (1 - f))).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

import type { Genero } from '../../domain/agentes';
export type { Genero };

export function aspecto(camisa: string, variante: number, genero: Genero): AspectoPersonaje {
  return {
    piel: PIELES[variante % PIELES.length]!,
    pelo: PELOS[(variante * 3 + 1) % PELOS.length]!,
    estilo: genero === 'f' ? ((variante % 2 ? 2 : 1) as 1 | 2) : ((variante % 2 ? 3 : 0) as 0 | 3),
    camisa,
    camisaOscura: oscurecer(camisa, 0.25),
    pantalon: '#2f3542',
  };
}

function cabeza(c: Ctx, a: AspectoPersonaje, dir: Direccion, dy: number): void {
  const y = 2 + dy;
  if (dir === 'sur' || dir === 'norte') {
    r(c, 6, y, 12, 11, a.piel);
    if (dir === 'sur') {
      r(c, 9, y + 6, 2, 2, CONTORNO); r(c, 13, y + 6, 2, 2, CONTORNO);          // ojos
      r(c, 9, y + 6, 1, 1, '#ffffff'); r(c, 13, y + 6, 1, 1, '#ffffff');
      r(c, 11, y + 9, 2, 1, oscurecer(a.piel, 0.3));                            // boca
      r(c, 7, y + 8, 2, 1, '#f08a8a'); r(c, 15, y + 8, 2, 1, '#f08a8a');        // mejillas
    }
    // pelo
    const pelo = a.pelo, luz = '#ffffff';
    if (dir === 'norte') r(c, 6, y, 12, 10, pelo);
    else r(c, 6, y, 12, 5, pelo);
    if (a.estilo === 3) { if (dir === 'sur') { r(c, 6, y, 12, 3, pelo); } }
    if (dir === 'sur') { r(c, 6, y + 4, 2, 3, pelo); r(c, 16, y + 4, 2, 3, pelo); r(c, 8, y + 4, 4, 1, pelo); }
    if (a.estilo === 1) { r(c, 5, y + 2, 2, 11, pelo); r(c, 17, y + 2, 2, 11, pelo); }
    if (a.estilo === 2) { r(c, 9, y - 3, 6, 4, pelo); r(c, 10, y - 4, 4, 1, pelo); }
    r(c, 8, y + 1, 4, 1, luz); c.globalAlpha = 0.35; r(c, 8, y + 1, 4, 1, luz); c.globalAlpha = 1;
    r(c, 8, y + 1, 4, 1, pelo); r(c, 8, y + 1, 3, 1, oscurecer(pelo, -0.2 > 0 ? 0 : 0));
  } else {
    // perfil mirando al este
    r(c, 7, y, 11, 11, a.piel);
    r(c, 15, y + 6, 2, 2, CONTORNO); r(c, 15, y + 6, 1, 1, '#ffffff');           // ojo
    r(c, 18, y + 7, 1, 2, a.piel);                                                  // nariz
    r(c, 14, y + 9, 3, 1, oscurecer(a.piel, 0.3));
    r(c, 7, y, 11, 5, a.pelo); r(c, 7, y + 4, 5, 6, a.pelo);                      // pelo y nuca
    if (a.estilo === 1) r(c, 6, y + 2, 4, 11, a.pelo);
    if (a.estilo === 2) { r(c, 5, y + 1, 4, 5, a.pelo); r(c, 5, y, 3, 1, a.pelo); }
    if (a.estilo === 3) r(c, 7, y, 11, 3, a.pelo);
    r(c, 13, y, 4, 1, '#ffffff'); c.globalAlpha = 0.3; r(c, 13, y, 4, 1, '#ffffff'); c.globalAlpha = 1; r(c, 13, y, 4, 1, a.pelo);
  }
}

function frenteOEspalda(c: Ctx, a: AspectoPersonaje, dir: 'sur' | 'norte', fotograma: number, sentado: boolean): void {
  const rebote = !sentado && (fotograma === 1 || fotograma === 3) ? -1 : 0;
  const levantaIzq = !sentado && fotograma === 1, levantaDer = !sentado && fotograma === 3;
  if (!sentado) {
    // piernas
    r(c, 8, 21, 4, levantaIzq ? 5 : 8, a.pantalon); r(c, 13, 21, 4, levantaDer ? 5 : 8, a.pantalon);
    r(c, 7, levantaIzq ? 26 : 28, 5, 3, '#1b1f27'); r(c, 12, levantaDer ? 26 : 28, 5, 3, '#1b1f27');
  }
  const dy = rebote;
  // brazos (se balancean al caminar)
  const braIzq = !sentado && fotograma === 1 ? 1 : !sentado && fotograma === 3 ? -1 : 0;
  r(c, 3, 13 + dy + braIzq, 3, 4, a.camisa); r(c, 3, 17 + dy + braIzq, 3, 4, a.piel);
  r(c, 18, 13 + dy - braIzq, 3, 4, a.camisa); r(c, 18, 17 + dy - braIzq, 3, 4, a.piel);
  // torso
  r(c, 6, 12 + dy, 12, 10, a.camisa);
  r(c, 6, 20 + dy, 12, 2, a.camisaOscura);
  r(c, 7, 12 + dy, 10, 1, '#ffffff'); c.globalAlpha = 0.25; r(c, 7, 12 + dy, 10, 1, '#ffffff'); c.globalAlpha = 1; r(c, 7, 12 + dy, 10, 1, a.camisa);
  if (dir === 'sur') {
    r(c, 11, 12 + dy, 2, 7, '#f57c00');                                             // cordón naranja
    r(c, 10, 18 + dy, 4, 4, '#ffffff'); r(c, 11, 19 + dy, 2, 1, '#f57c00'); r(c, 11, 21 + dy, 2, 1, '#9aa3b2');  // tarjeta
    r(c, 10, 12 + dy, 4, 2, a.piel);                                                // cuello
  }
  cabeza(c, a, dir, dy);
}

function lateral(c: Ctx, a: AspectoPersonaje, fotograma: number, sentado: boolean): void {
  const rebote = !sentado && (fotograma === 1 || fotograma === 3) ? -1 : 0;
  const dy = rebote;
  const paso = sentado ? 0 : fotograma === 1 ? 3 : fotograma === 3 ? -3 : 0;
  if (!sentado) {
    r(c, 9 - paso, 21, 4, 8, a.pantalon); r(c, 8 - paso, 28, 5, 3, '#1b1f27');       // pierna de atrás
    r(c, 11 + paso, 21, 4, 8, '#232a38'); r(c, 11 + paso, 28, 5, 3, '#1b1f27');      // pierna de delante
  }
  r(c, 7, 12 + dy, 10, 10, a.camisa); r(c, 7, 20 + dy, 10, 2, a.camisaOscura);
  r(c, 15, 12 + dy, 2, 7, '#f57c00');
  r(c, 11 + paso / 2, 13 + dy, 4, 4, a.camisa); r(c, 11 + paso / 2, 17 + dy, 4, 4, a.piel);   // brazo delantero
  cabeza(c, a, 'este', dy);
}

/** Aplica un contorno oscuro de 1 px alrededor de todo lo dibujado en el lienzo. */
function conContorno(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const sc = src.getContext('2d')!;
  const d = sc.getImageData(0, 0, w, h);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const oc = out.getContext('2d')!;
  const o = oc.createImageData(w, h);
  const opaco = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d.data[(y * w + x) * 4 + 3]! > 200;
  const [cr, cg, cb] = [0x23, 0x27, 0x33];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (opaco(x, y)) { o.data[i] = d.data[i]!; o.data[i + 1] = d.data[i + 1]!; o.data[i + 2] = d.data[i + 2]!; o.data[i + 3] = 255; }
      else if (opaco(x - 1, y) || opaco(x + 1, y) || opaco(x, y - 1) || opaco(x, y + 1)) { o.data[i] = cr; o.data[i + 1] = cg; o.data[i + 2] = cb; o.data[i + 3] = 255; }
    }
  }
  oc.putImageData(o, 0, 0);
  return out;
}

/**
 * Dibuja un personaje en (ox, oy) de `destino`. `fotograma` 0–3 (0 y 2 = piernas juntas, 1 y 3 = paso).
 * `sentado`: solo medio cuerpo, para los puestos de trabajo.
 */
export function dibujarPersonaje(destino: Ctx, ox: number, oy: number, a: AspectoPersonaje, dir: Direccion, fotograma = 0, sentado = false): void {
  const tmp = document.createElement('canvas');
  tmp.width = ANCHO_FOTOGRAMA; tmp.height = ALTO_FOTOGRAMA;
  const c = tmp.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  if (dir === 'sur' || dir === 'norte') frenteOEspalda(c, a, dir, fotograma, sentado);
  else lateral(c, a, fotograma, sentado);
  const con = conContorno(tmp);
  if (!sentado) {
    destino.fillStyle = 'rgba(20, 24, 12, 0.28)';
    for (let y = -1; y <= 1; y++) destino.fillRect(ox + 5 + Math.abs(y), oy + 29 + y, 14 - 2 * Math.abs(y), 1);
  }
  destino.imageSmoothingEnabled = false;
  if (dir === 'oeste') {
    destino.save(); destino.translate(ox + ANCHO_FOTOGRAMA, oy); destino.scale(-1, 1); destino.drawImage(con, 0, 0); destino.restore();
  } else destino.drawImage(con, ox, oy);
}
