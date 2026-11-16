import { camisaDeDepartamento, type Agente, type Genero, type PuestoAsignable } from './agentes';

export const MAX_NOMBRE = 40;
export const VARIANTES = 12;

export interface DatosAgente {
  nombre: string;
  asientoId: string;
  genero: Genero;
  /** Aspecto (piel, pelo y peinado), de 0 a 11. */
  variante: number;
}

/** Puestos de trabajo sin agente. `editandoId` libera el puesto del agente que se está editando. */
export function puestosLibres(asientos: readonly PuestoAsignable[], agentes: readonly Agente[], editandoId?: string): PuestoAsignable[] {
  const ocupados = new Set(agentes.filter((a) => a.id !== editandoId).map((a) => a.asientoId));
  return asientos.filter((s) => s.tipo !== 'reuniones' && !!s.zona && !ocupados.has(s.id));
}

/** Devuelve los problemas de los datos, en español; vacío si todo está bien. */
export function validarDatosAgente(d: DatosAgente, asientos: readonly PuestoAsignable[], agentes: readonly Agente[], editandoId?: string): string[] {
  const errores: string[] = [];
  const nombre = d.nombre.trim();
  if (!nombre) errores.push('Escribe el nombre del agente.');
  else if (nombre.length > MAX_NOMBRE) errores.push(`El nombre puede tener como máximo ${MAX_NOMBRE} caracteres.`);
  else if (agentes.some((a) => a.id !== editandoId && a.nombre.trim().toLowerCase() === nombre.toLowerCase())) errores.push('Ya existe un agente con ese nombre.');

  const asiento = asientos.find((s) => s.id === d.asientoId);
  if (!asiento || asiento.tipo === 'reuniones' || !asiento.zona) errores.push('Elige un puesto de trabajo válido.');
  else if (agentes.some((a) => a.id !== editandoId && a.asientoId === d.asientoId)) errores.push('Ese puesto ya está ocupado por otro agente.');

  if (d.genero !== 'f' && d.genero !== 'm') errores.push('Elige si es chico o chica.');
  if (!Number.isInteger(d.variante) || d.variante < 0 || d.variante >= VARIANTES) errores.push('Elige un aspecto de la lista.');
  return errores;
}

/**
 * Construye el agente a partir del formulario. Si se pasa `existente`, es una edición:
 * se conservan su id y su estado. Lanza un error con el motivo si los datos no valen.
 */
export function construirAgente(d: DatosAgente, asientos: readonly PuestoAsignable[], agentes: readonly Agente[], existente?: Agente): Agente {
  const errores = validarDatosAgente(d, asientos, agentes, existente?.id);
  if (errores.length) throw new Error(errores.join(' '));
  const zona = asientos.find((s) => s.id === d.asientoId)!.zona!;
  let id = existente?.id;
  if (!id) {
    const usados = new Set(agentes.map((a) => a.id));
    let n = 1;
    while (usados.has(`${zona}-${n}`)) n++;
    id = `${zona}-${n}`;
  }
  return {
    id,
    nombre: d.nombre.trim(),
    departamento: zona,
    genero: d.genero,
    camisa: camisaDeDepartamento(zona),
    variante: d.variante,
    asientoId: d.asientoId,
    estado: existente?.estado ?? 'trabajando',
  };
}
