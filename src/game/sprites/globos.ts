/** Globos de estado sobre la cabeza de cada agente (16 × 16 px). */
export type EstadoAgente = 'trabajando' | 'pensando' | 'esperando' | 'en_reunion' | 'completada' | 'error';

export const NOMBRE_ESTADO: Record<EstadoAgente, string> = {
  trabajando: 'Trabajando',
  pensando: 'Pensando',
  esperando: 'Esperando instrucciones',
  en_reunion: 'En reunión',
  completada: 'Tarea completada',
  error: 'Error',
};

export const COLOR_ESTADO: Record<EstadoAgente, string> = {
  trabajando: '#f57c00',
  pensando: '#4f86c6',
  esperando: '#8a93a1',
  en_reunion: '#8e24aa',
  completada: '#3fae5a',
  error: '#d6403a',
};

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

export const TAM_GLOBO = 16;

/** Dibuja el globo del estado en (ox, oy). */
export function dibujarGlobo(c: Ctx, ox: number, oy: number, estado: EstadoAgente): void {
  const borde = '#232733', col = COLOR_ESTADO[estado];
  // burbuja redondeada con colita
  r(c, ox + 1, oy, 14, 1, borde); r(c, ox + 1, oy + 12, 14, 1, borde);
  r(c, ox, oy + 1, 1, 11, borde); r(c, ox + 15, oy + 1, 1, 11, borde);
  r(c, ox + 1, oy + 1, 14, 11, '#ffffff');
  r(c, ox + 1, oy + 1, 14, 1, '#f1f4f8');
  r(c, ox + 6, oy + 13, 4, 1, borde); r(c, ox + 7, oy + 14, 2, 1, borde); r(c, ox + 7, oy + 13, 2, 1, '#ffffff');
  const x = ox, y = oy;
  if (estado === 'trabajando') {            // engranaje
    r(c, x + 6, y + 3, 4, 7, col); r(c, x + 4, y + 5, 8, 3, col); r(c, x + 5, y + 4, 6, 5, col);
    r(c, x + 7, y + 5, 2, 3, '#ffffff'); r(c, x + 7, y + 2, 2, 1, col); r(c, x + 7, y + 10, 2, 1, col); r(c, x + 3, y + 6, 1, 1, col); r(c, x + 12, y + 6, 1, 1, col);
  }
  if (estado === 'pensando') {              // tres puntos
    r(c, x + 3, y + 5, 2, 2, col); r(c, x + 7, y + 5, 2, 2, col); r(c, x + 11, y + 5, 2, 2, col);
    r(c, x + 3, y + 8, 2, 1, '#aebfdc'); r(c, x + 7, y + 8, 2, 1, '#aebfdc');
  }
  if (estado === 'esperando') {             // reloj de arena
    r(c, x + 4, y + 2, 8, 1, col); r(c, x + 4, y + 10, 8, 1, col);
    r(c, x + 5, y + 3, 6, 1, col); r(c, x + 6, y + 4, 4, 1, col); r(c, x + 7, y + 5, 2, 2, col);
    r(c, x + 6, y + 8, 4, 1, col); r(c, x + 5, y + 9, 6, 1, col); r(c, x + 7, y + 7, 2, 1, '#d6dbe3');
  }
  if (estado === 'en_reunion') {            // dos bocadillos
    r(c, x + 3, y + 3, 6, 4, col); r(c, x + 4, y + 7, 2, 1, col);
    r(c, x + 7, y + 6, 6, 4, '#c58be0'); r(c, x + 10, y + 10, 2, 1, '#c58be0');
    r(c, x + 4, y + 4, 4, 1, '#ffffff'); r(c, x + 8, y + 7, 4, 1, '#ffffff');
  }
  if (estado === 'completada') {            // visto bueno
    r(c, x + 3, y + 6, 2, 2, col); r(c, x + 5, y + 8, 2, 2, col); r(c, x + 7, y + 6, 2, 2, col); r(c, x + 9, y + 4, 2, 2, col); r(c, x + 11, y + 2, 2, 2, col);
  }
  if (estado === 'error') {                 // exclamación
    r(c, x + 7, y + 2, 2, 5, col); r(c, x + 7, y + 8, 2, 2, col);
  }
}
