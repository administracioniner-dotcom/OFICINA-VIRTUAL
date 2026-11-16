import type { TipoZona } from './plano';
import { NOMBRE_ZONA } from './zonas';

export type EstadoAgente = 'trabajando' | 'pensando' | 'esperando' | 'en_reunion' | 'completada' | 'error';
export type Genero = 'f' | 'm';

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
}

/** Lo mínimo que se necesita de un asiento para asignarlo. */
export interface PuestoAsignable { id: string; tipo: string; zona?: TipoZona }

interface Plantilla { departamento: TipoZona; generos: readonly Genero[]; camisa: string; tipoAsiento: 'escritorio' | 'mesa4' }

/** Agentes de la fase 1: uno por puesto de trabajo. Los puestos de la mesa de Ingeniería quedan libres. */
const PLANTILLAS: readonly Plantilla[] = [
  { departamento: 'direccion', generos: ['m', 'f'], camisa: '#3d4452', tipoAsiento: 'escritorio' },
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
