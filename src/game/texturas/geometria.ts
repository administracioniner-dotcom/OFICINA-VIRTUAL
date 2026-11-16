/** Geometría compartida entre el dibujo de las texturas y los puestos de los agentes (píxeles locales de cada textura). */
export type LadoSilla = 'norte' | 'sur' | 'este' | 'oeste';

/** Centro de la silla de un escritorio y su lado, según el giro (la textura ya viene girada). */
export const SILLA_ESCRITORIO = {
  0: { x: 32, y: 24, lado: 'sur' },
  180: { x: 32, y: 8, lado: 'norte' },
  90: { x: 8, y: 32, lado: 'oeste' },
  270: { x: 24, y: 32, lado: 'este' },
} as const satisfies Record<number, { x: number; y: number; lado: LadoSilla }>;

/** Mesas verticales (2 × 4 baldosas, giro 90): sillas a oeste y este en estas filas. */
export const SILLAS_MESA_VERTICAL = {
  oeste: 9,
  este: 55,
  filasReuniones: [16, 48, 80, 112],
  filasMesa4: [48, 80],
} as const;
