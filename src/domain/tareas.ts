import type { Agente } from './agentes';
import type { TipoZona } from './plano';

export type EstadoTarea = 'pendiente' | 'en_curso' | 'hecha';

export interface Tarea {
  id: string;
  agenteId: string;
  titulo: string;
  estado: EstadoTarea;
}

/** Títulos genéricos por departamento. Son simulados: no son datos de negocio. */
const TITULOS: Partial<Record<TipoZona, readonly string[]>> = {
  direccion: ['Revisar informe semanal', 'Aprobar planificación', 'Preparar reunión de coordinación'],
  ingenieria: ['Revisar planos', 'Calcular dimensionado', 'Actualizar memoria técnica'],
  compras: ['Comparar ofertas', 'Revisar pedido pendiente', 'Actualizar lista de proveedores'],
  recepcion: ['Atender llamadas', 'Registrar visitas', 'Organizar la agenda'],
  desarrollo: ['Revisar código', 'Corregir una incidencia', 'Probar la nueva versión'],
  marketing: ['Preparar una publicación', 'Revisar una campaña', 'Actualizar el catálogo'],
  cae: ['Revisar documentación', 'Actualizar un expediente', 'Comprobar caducidades'],
  admin: ['Conciliar facturas', 'Preparar una remesa', 'Archivar documentos'],
};

/** Genera 3 tareas pendientes simuladas. `desde` es el número de la primera (para que los ids no se repitan). */
export function generarTareas(agente: Agente, desde: number): Tarea[] {
  const titulos = TITULOS[agente.departamento] ?? ['Tarea general', 'Otra tarea general', 'Una tarea más'];
  return titulos.map((t, i) => ({
    id: `${agente.id}-t${desde + i}`,
    agenteId: agente.id,
    titulo: `${t} (simulada)`,
    estado: 'pendiente' as const,
  }));
}
