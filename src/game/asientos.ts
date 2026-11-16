import { zonaEn, type Celda, type Objeto, type Plano, type TipoZona } from '../domain/plano';
import type { Direccion } from './sprites/personaje';
import { TILE } from './paleta';
import { SILLAS_MESA_VERTICAL, SILLA_ESCRITORIO, type LadoSilla } from './texturas/geometria';

export type TipoAsiento = 'escritorio' | 'mesa4' | 'reuniones';

export interface Asiento {
  id: string;
  tipo: TipoAsiento;
  /** Centro de la silla, en píxeles del mapa. */
  x: number;
  y: number;
  /** Hacia dónde mira la persona sentada. */
  mira: Direccion;
  /** Lado de la mesa en el que está la silla. */
  lado: LadoSilla;
  /** Baldosa libre desde la que se llega a la silla. */
  acceso: Celda;
  zona?: TipoZona;
  objeto: { x: number; y: number };
  /** Borde inferior del mueble en píxeles: su profundidad al ordenar el dibujo. */
  fondo: number;
}

const MIRA: Record<LadoSilla, Direccion> = { sur: 'norte', norte: 'sur', oeste: 'este', este: 'oeste' };
const HACIA_FUERA: Record<LadoSilla, readonly [number, number]> = { sur: [0, 1], norte: [0, -1], oeste: [-1, 0], este: [1, 0] };

function crear(p: Plano, o: Objeto, id: string, tipo: TipoAsiento, lx: number, ly: number, lado: LadoSilla): Asiento {
  const x = o.x * TILE + lx, y = o.y * TILE + ly;
  const [dx, dy] = HACIA_FUERA[lado];
  const acceso: Celda = [Math.floor((x + dx * 0.75 * TILE) / TILE), Math.floor((y + dy * 0.75 * TILE) / TILE)];
  const asiento: Asiento = { id, tipo, x, y, mira: MIRA[lado], lado, acceso, objeto: { x: o.x, y: o.y }, fondo: (o.y + o.alto) * TILE };
  const zona = zonaEn(p, Math.floor(x / TILE), Math.floor(y / TILE))?.tipo;
  if (zona) asiento.zona = zona;
  return asiento;
}

/**
 * Deriva los asientos del plano. Las sillas están dentro de la huella de cada mesa o escritorio
 * (ver `texturas/geometria.ts`). Las mesas solo se admiten con giro 90 (verticales).
 */
export function asientosDelPlano(p: Plano): Asiento[] {
  const res: Asiento[] = [];
  for (const o of p.objetos) {
    const id = `${o.tipo}-${o.x}-${o.y}`;
    if (o.tipo === 'escritorio') {
      const s = SILLA_ESCRITORIO[o.giro];
      res.push(crear(p, o, id, 'escritorio', s.x, s.y, s.lado));
    } else if ((o.tipo === 'mesa' || o.tipo === 'mesa4') && o.giro === 90) {
      const filas = o.tipo === 'mesa' ? SILLAS_MESA_VERTICAL.filasReuniones : SILLAS_MESA_VERTICAL.filasMesa4;
      const tipo: TipoAsiento = o.tipo === 'mesa' ? 'reuniones' : 'mesa4';
      filas.forEach((fy, i) => {
        res.push(crear(p, o, `${id}-o${i}`, tipo, SILLAS_MESA_VERTICAL.oeste, fy, 'oeste'));
        res.push(crear(p, o, `${id}-e${i}`, tipo, SILLAS_MESA_VERTICAL.este, fy, 'este'));
      });
    }
  }
  return res;
}

/** Profundidad de dibujo de quien está sentado: detrás de la mesa si la silla está al norte; delante en los demás casos. */
export function profundidadSentado(a: Asiento): number {
  return a.lado === 'norte' ? a.fondo - 0.5 : a.fondo + 0.5;
}
