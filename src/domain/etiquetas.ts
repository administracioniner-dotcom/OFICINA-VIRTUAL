import type { PuestoAsignable } from './agentes';
import { NOMBRE_ZONA } from './zonas';

/** Nombre legible de un puesto de trabajo. */
export function etiquetaPuesto(p: PuestoAsignable): string {
  const zona = p.zona ? NOMBRE_ZONA[p.zona] : undefined;
  if (p.tipo === 'reuniones') return 'Silla de la sala de reuniones';
  if (p.tipo === 'mesa4') return p.zona === 'ingenieria' ? 'Mesa compartida de Ingeniería' : `Puesto de ${zona ?? 'la oficina'} en la mesa compartida`;
  return zona ? `Escritorio de ${zona}` : 'Escritorio';
}

/** «hace 12 s», «hace 2 min» o «ahora mismo». */
export function hace(t: number, ahora: number): string {
  const s = Math.floor((ahora - t) / 1000);
  if (s < 2) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  return `hace ${Math.floor(s / 60)} min`;
}
