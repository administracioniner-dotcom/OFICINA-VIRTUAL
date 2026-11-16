import type { Objeto, TipoObjeto, TipoZona } from '../../domain/plano';

export type ColorSilla = 'rojo' | 'gris' | 'naranja';

/** Color de las sillas ergonómicas según el departamento de la zona. */
export function colorSilla(zona?: TipoZona): ColorSilla {
  if (zona === 'cae' || zona === 'desarrollo') return 'rojo';
  if (zona === 'ingenieria') return 'naranja';
  return 'gris';
}

/** Tamaño base (ancho, alto) en baldosas de cada objeto, sin girar. */
export const DIMENSIONES: Record<TipoObjeto, readonly [number, number]> = {
  escritorio: [2, 1], puerta: [1, 1], sofa: [2, 1], mesa: [4, 2], planta: [1, 1],
  entrada: [2, 1], nevera: [1, 1], mesapeq: [2, 2], mesa4: [4, 2], mesasola: [2, 1],
  impresora: [1, 1], tele: [2, 1], agua: [1, 1], silla: [1, 1], futbolin: [2, 1],
  patinete: [2, 1], bici: [2, 1], microondas: [1, 1],
};

export const TEXTURAS_REQUERIDAS: readonly string[] = [
  'suelo-0', 'suelo-1', 'suelo-2', 'suelo-3', 'alfombra',
  ...Array.from({ length: 16 }, (_, i) => `muro-${i}`),
  'mampara', 'ventana', 'estanteria', 'sombra-muro',
  'obj-escritorio-rojo', 'obj-escritorio-gris', 'obj-escritorio-naranja',
  'obj-mesa4-naranja', 'obj-mesa4-isla',
  ...(['rojo', 'gris', 'naranja'] as const).flatMap((c) => ([0, 90, 180, 270] as const).map((g) => `obj-escritorio-${c}-${g}`)),
  'obj-mesa-90', 'obj-mesa4-naranja-90', 'obj-mesa4-isla-90', 'obj-tele-180',
  'obj-puerta', 'obj-sofa', 'obj-mesa', 'obj-planta', 'obj-entrada', 'obj-nevera',
  'obj-mesapeq', 'obj-mesasola', 'obj-impresora', 'obj-tele', 'obj-agua', 'obj-silla',
  'obj-futbolin', 'obj-patinete', 'obj-bici', 'obj-microondas',
];

/** Clave de la textura de un objeto. `zona` decide el color de las sillas integradas. */
export function claveObjeto(o: Objeto, zona?: TipoZona): string {
  if (o.tipo === 'escritorio') return `obj-escritorio-${colorSilla(zona)}`;
  if (o.tipo === 'mesa4') return zona === 'ingenieria' ? 'obj-mesa4-naranja' : 'obj-mesa4-isla';
  return `obj-${o.tipo}`;
}

/** Clave de la textura de un muro según su máscara de vecinas (0–15). */
export const claveMuro = (mascara: number): string => `muro-${mascara}`;

/**
 * Texturas que ya vienen dibujadas en su orientación final (pantallas y papeles derechos).
 * La escena no las gira. Si un objeto tiene un giro sin textura propia, se usa la textura base girada.
 */
const PREGIRADAS: ReadonlySet<string> = new Set([
  ...(['rojo', 'gris', 'naranja'] as const).flatMap((c) => ([0, 90, 180, 270] as const).map((g) => `obj-escritorio-${c}-${g}`)),
  'obj-mesa-90', 'obj-mesa4-naranja-90', 'obj-mesa4-isla-90', 'obj-tele-180',
]);

export interface TexturaObjeto { clave: string; angulo: number }

export function texturaObjeto(o: Objeto, zona?: TipoZona): TexturaObjeto {
  const base = claveObjeto(o, zona);
  const girada = `${base}-${o.giro}`;
  return PREGIRADAS.has(girada) ? { clave: girada, angulo: 0 } : { clave: base, angulo: o.giro };
}
