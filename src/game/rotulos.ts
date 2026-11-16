import type { Plano, Zona } from '../domain/plano';
import { ETIQUETA_ZONA } from '../domain/zonas';
import { TILE } from './paleta';

const ANCHO_LETRA = TILE / 2; // fuente pixel de media baldosa (16 px)
const SEPARACION = TILE / 4; // hueco mínimo entre rótulos
const MARGEN = TILE / 4; // margen del rótulo respecto al borde de su zona

export interface Rect { x: number; y: number; ancho: number; alto: number }
export interface Rotulo extends Rect { zona: Zona; lineas: string[] }

/** Parte el texto en líneas que quepan en `maxPx` (8 px por letra). */
export function lineasRotulo(texto: string, maxPx: number): string[] {
  const maxLetras = Math.max(1, Math.floor(maxPx / ANCHO_LETRA));
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (prueba.length <= maxLetras || !actual) actual = prueba;
    else { lineas.push(actual); actual = palabra; }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Todo lo que un rótulo no debe tapar: muros, mamparas, ventanas, estanterías y objetos. */
export function rectsObstaculo(p: Plano): Rect[] {
  const celdas = [...p.muros, ...p.mamparas, ...p.ventanas, ...p.estanterias];
  return [
    ...celdas.map(([x, y]) => ({ x: x * TILE, y: y * TILE, ancho: TILE, alto: TILE })),
    ...p.objetos.map((o) => ({ x: o.x * TILE, y: o.y * TILE, ancho: o.ancho * TILE, alto: o.alto * TILE })),
  ];
}

const choca = (a: Rect, b: Rect, margen = 0) =>
  a.x < b.x + b.ancho + margen && b.x < a.x + a.ancho + margen &&
  a.y < b.y + b.alto + margen && b.y < a.y + a.alto + margen;

/**
 * Coloca el rótulo de cada zona sin tapar mobiliario ni otros rótulos.
 * Primero lo intenta dentro de la zona (arriba a la izquierda); si no cabe, fuera,
 * centrado sobre la zona (encima o debajo).
 */
export function colocarRotulos(p: Plano): Rotulo[] {
  const obstaculos = rectsObstaculo(p);
  const colocados: Rotulo[] = [];
  const mapa: Rect = { x: 0, y: 0, ancho: p.ancho * TILE, alto: p.alto * TILE };

  const cabe = (r: Rect) =>
    r.x >= 0 && r.y >= 0 && r.x + r.ancho <= mapa.ancho && r.y + r.alto <= mapa.alto &&
    !obstaculos.some((o) => choca(r, o)) &&
    !colocados.some((c) => choca(r, c, SEPARACION));

  for (const zona of p.zonas) {
    const lineas = lineasRotulo(ETIQUETA_ZONA[zona.tipo], zona.ancho * TILE - 2 * MARGEN);
    const ancho = Math.max(...lineas.map((l) => l.length)) * ANCHO_LETRA;
    const alto = lineas.length * ANCHO_LETRA + (lineas.length - 1) * (TILE / 8);
    const derecha = (zona.x + zona.ancho) * TILE - MARGEN / 2;
    const abajo = (zona.y + zona.alto) * TILE;

    const candidatos: Rect[] = [];
    // dentro de la zona: filas de arriba abajo, columnas de izquierda a derecha
    for (let f = 0; f < zona.alto; f++) {
      for (let c = 0; c < zona.ancho; c++) {
        const r = { x: (zona.x + c) * TILE + MARGEN, y: (zona.y + f) * TILE + MARGEN, ancho, alto };
        if (r.x + ancho <= derecha && r.y + alto <= abajo) candidatos.push(r);
      }
    }
    // fuera: centrado, encima y debajo
    const xCentro = zona.x * TILE + (zona.ancho * TILE - ancho) / 2;
    for (const k of [1, 2]) candidatos.push({ x: xCentro, y: (zona.y - k) * TILE + MARGEN, ancho, alto });
    for (const k of [0, 1]) candidatos.push({ x: xCentro, y: (zona.y + zona.alto + k) * TILE + MARGEN, ancho, alto });

    const elegido = candidatos.find(cabe) ?? candidatos[0]!;
    colocados.push({ ...elegido, zona, lineas });
  }
  return colocados;
}
