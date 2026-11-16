import { useSyncExternalStore } from 'react';
import type { Almacen, EstadoAlmacen } from './almacen';

/** Lee el estado del almacén y vuelve a pintar cuando cambia. */
export function useAlmacen(almacen: Almacen): EstadoAlmacen {
  return useSyncExternalStore(almacen.subscribe, almacen.getState, almacen.getState);
}
