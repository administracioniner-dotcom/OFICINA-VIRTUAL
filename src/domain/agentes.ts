import type { TipoZona } from './plano';
import { NOMBRE_ZONA } from './zonas';

export type EstadoAgente = 'trabajando' | 'pensando' | 'esperando' | 'en_reunion' | 'completada' | 'error';
export type Genero = 'f' | 'm';

export type Origen = 'simulado' | 'real';

export interface Agente {
  id: string;
  nombre: string;
  departamento: TipoZona;
  genero: Genero;
  camisa: string;
  /** Variante de aspecto (piel y pelo), fija por agente. */
  variante: number;
  asientoId: string;
  estado: EstadoAgente;
  /** `real`: lo mueven los avisos de Claude Code. Sin indicar, es simulado. */
  origen?: Origen;
}

export const esReal = (a: Pick<Agente, 'origen'>): boolean => a.origen === 'real';

/** Lo mínimo que se necesita de un asiento para asignarlo. */
export interface PuestoAsignable { id: string; tipo: string; zona?: TipoZona }

interface Plantilla { departamento: TipoZona; generos: readonly Genero[]; camisa: string; tipoAsiento: 'escritorio' | 'mesa4' }

/** Agentes de la fase 1: uno por puesto de trabajo. Los puestos de la mesa de Ingeniería quedan libres. */
const PLANTILLAS: readonly Plantilla[] = [
  { departamento: 'direccion', generos: ['m'], camisa: '#3d4452', tipoAsiento: 'escritorio' },
  { departamento: 'ingenieria', generos: ['m', 'm'], camisa: '#f57c00', tipoAsiento: 'escritorio' },
  { departamento: 'compras', generos: ['f'], camisa: '#8d6e63', tipoAsiento: 'escritorio' },
  { departamento: 'recepcion', generos: ['f'], camisa: '#e5a800', tipoAsiento: 'escritorio' },
  { departamento: 'desarrollo', generos: ['f'], camisa: '#d6403a', tipoAsiento: 'mesa4' },
  { departamento: 'marketing', generos: ['f'], camisa: '#e84a9a', tipoAsiento: 'mesa4' },
  { departamento: 'cae', generos: ['m'], camisa: '#00897b', tipoAsiento: 'mesa4' },
  { departamento: 'admin', generos: ['f'], camisa: '#5c6bc0', tipoAsiento: 'mesa4' },
];

export function crearAgentes(asientos: readonly PuestoAsignable[]): Agente[] {
  const agentes: Agente[] = [];
  let variante = 0;
  for (const pl of PLANTILLAS) {
    const propios = asientos.filter((a) => a.tipo === pl.tipoAsiento && a.zona === pl.departamento);
    pl.generos.forEach((genero, i) => {
      const asiento = propios[i];
      if (!asiento) throw new Error(`No hay asiento para ${NOMBRE_ZONA[pl.departamento]} ${i + 1}`);
      agentes.push({
        id: `${pl.departamento}-${i + 1}`,
        nombre: `Agente ${NOMBRE_ZONA[pl.departamento]} ${i + 1}`,
        departamento: pl.departamento, genero, camisa: pl.camisa, variante: variante++,
        asientoId: asiento.id, estado: 'trabajando',
      });
    });
  }
  return agentes;
}

const CAMISA_POR_DEPARTAMENTO: Partial<Record<TipoZona, string>> = Object.fromEntries(PLANTILLAS.map((p) => [p.departamento, p.camisa]));

/** Agentes de más para una prueba de carga: uno en cada puesto de trabajo que quede libre. No se usa en la versión normal. */
export function crearAgentesExtra(asientos: readonly PuestoAsignable[], existentes: readonly Agente[]): Agente[] {
  const usados = new Set(existentes.map((a) => a.asientoId));
  const contador = new Map<TipoZona, number>();
  for (const a of existentes) contador.set(a.departamento, (contador.get(a.departamento) ?? 0) + 1);
  const extra: Agente[] = [];
  let variante = existentes.length;
  for (const s of asientos) {
    if (usados.has(s.id) || s.tipo === 'reuniones' || !s.zona) continue;
    const n = (contador.get(s.zona) ?? 0) + 1;
    contador.set(s.zona, n);
    extra.push({
      id: `${s.zona}-${n}`, nombre: `Agente ${NOMBRE_ZONA[s.zona]} ${n}`, departamento: s.zona,
      genero: variante % 2 ? 'f' : 'm', camisa: CAMISA_POR_DEPARTAMENTO[s.zona] ?? '#5c6bc0', variante: variante++,
      asientoId: s.id, estado: 'trabajando',
    });
  }
  return extra;
}

/** Color de camisa del departamento. */
export function camisaDeDepartamento(zona: TipoZona): string {
  return CAMISA_POR_DEPARTAMENTO[zona] ?? '#5c6bc0';
}
