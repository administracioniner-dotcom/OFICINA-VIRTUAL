import type { TipoZona } from './plano';

export const NOMBRE_ZONA: Record<TipoZona, string> = {
  recepcion: 'Recepción',
  direccion: 'Dirección',
  cae: 'CAE',
  admin: 'Administración',
  desarrollo: 'Desarrollo',
  reuniones: 'Sala de reuniones',
  descanso: 'Descanso',
  ingenieria: 'Ingeniería',
  compras: 'Compras',
  marketing: 'Marketing',
};

/** Rótulo corto para dibujar dentro del mapa (cabe en zonas pequeñas). */
export const ETIQUETA_ZONA: Record<TipoZona, string> = {
  recepcion: 'RECEP.',
  direccion: 'DIRECCION',
  cae: 'CAE',
  admin: 'ADM',
  desarrollo: 'DES',
  reuniones: 'SALA DE REUNIONES',
  descanso: 'DESCANSO',
  ingenieria: 'INGENIERIA',
  compras: 'COMPRAS',
  marketing: 'MKT',
};
