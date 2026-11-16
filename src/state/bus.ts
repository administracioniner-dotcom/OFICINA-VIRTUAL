import type { TipoZona } from '../domain/plano';

export interface EventosOficina {
  'zona:ir': TipoZona;
  'zoom:cambiar': 1 | -1;
  'camara:zoom': number;
}

type Oyente<T> = (valor: T) => void;
const oyentes = new Map<keyof EventosOficina, Set<Oyente<never>>>();

export const bus = {
  emit<K extends keyof EventosOficina>(clave: K, valor: EventosOficina[K]): void {
    oyentes.get(clave)?.forEach((fn) => (fn as Oyente<EventosOficina[K]>)(valor));
  },
  on<K extends keyof EventosOficina>(clave: K, fn: Oyente<EventosOficina[K]>): () => void {
    const set = oyentes.get(clave) ?? new Set();
    set.add(fn as Oyente<never>);
    oyentes.set(clave, set);
    return () => { set.delete(fn as Oyente<never>); };
  },
};
