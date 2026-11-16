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
  'suelo-0', 'suelo-1', 'suelo-2', 'suelo-3', 'alfombra', 'muro', 'muro-frente',
  'mampara', 'ventana', 'estanteria',
  'obj-escritorio-rojo', 'obj-escritorio-gris', 'obj-escritorio-naranja',
  'obj-mesa4-naranja', 'obj-mesa4-isla',
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
