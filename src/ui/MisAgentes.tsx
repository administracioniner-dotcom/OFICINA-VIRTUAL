import { puestosLibres } from '../domain/gestionAgentes';
import type { Almacen } from '../state/almacen';
import type { Gestor } from '../state/gestor';
import { useAlmacen } from '../state/useAlmacen';

/** Panel de arriba a la izquierda: cuántos agentes hay y el botón para crear uno. */
export function MisAgentes({ almacen, gestor, alCrear }: { almacen: Almacen; gestor: Gestor; alCrear(): void }) {
  const e = useAlmacen(almacen);
  const agentes = gestor.agentes();
  const libres = puestosLibres(Object.values(e.puestos), agentes).length;
  return (
    <section className="panel mis-agentes" aria-label="Mis agentes">
      <button type="button" className="boton principal" onClick={alCrear} disabled={libres === 0}>＋ Nuevo agente</button>
      <span className="contador">{agentes.length} {agentes.length === 1 ? 'agente' : 'agentes'} · {libres} {libres === 1 ? 'puesto libre' : 'puestos libres'}</span>
      {!gestor.guardadoCorrecto() && <p className="aviso-guardado" role="status">No se pudo guardar en este navegador: los cambios se perderán al cerrar.</p>}
    </section>
  );
}
