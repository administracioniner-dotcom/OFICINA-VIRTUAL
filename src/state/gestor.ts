import type { Agente, PuestoAsignable } from '../domain/agentes';
import { construirAgente, type DatosAgente } from '../domain/gestionAgentes';
import { guardarAgentes, type Almacenamiento } from './persistencia';

/** Lo que el gestor necesita del simulador (o de una fuente real en el futuro). */
export interface FuenteEditable {
  agregar(a: Agente): void;
  actualizar(a: Agente): void;
  quitar(id: string): void;
}

export interface Gestor {
  agentes(): Agente[];
  crear(d: DatosAgente): Agente;
  editar(id: string, d: DatosAgente): Agente;
  quitar(id: string): void;
  /** ¿Se pudo guardar la última vez? Falso en modo privado o con el almacenamiento lleno. */
  guardadoCorrecto(): boolean;
}

interface Opciones {
  almacenamiento: Almacenamiento;
  fuente: FuenteEditable;
  asientos: readonly PuestoAsignable[];
  inicial: readonly Agente[];
}

/** Lista de agentes del usuario: valida los cambios, los guarda en el navegador y avisa a la fuente. */
export function crearGestor({ almacenamiento, fuente, asientos, inicial }: Opciones): Gestor {
  let lista: Agente[] = [...inicial];
  let guardado = true;
  const guardar = () => { guardado = guardarAgentes(almacenamiento, lista); };

  return {
    agentes: () => [...lista],
    crear(d) {
      const a = construirAgente(d, asientos, lista);
      lista = [...lista, a];
      guardar();
      fuente.agregar(a);
      return a;
    },
    editar(id, d) {
      const actual = lista.find((x) => x.id === id);
      if (!actual) throw new Error('Ese agente ya no existe.');
      const a = construirAgente(d, asientos, lista, actual);
      lista = lista.map((x) => (x.id === id ? a : x));
      guardar();
      fuente.actualizar(a);
      return a;
    },
    quitar(id) {
      if (!lista.some((x) => x.id === id)) return;
      lista = lista.filter((x) => x.id !== id);
      guardar();
      fuente.quitar(id);
    },
    guardadoCorrecto: () => guardado,
  };
}
