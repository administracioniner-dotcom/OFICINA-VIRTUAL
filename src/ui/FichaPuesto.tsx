import { etiquetaPuesto } from '../domain/etiquetas';
import { NOMBRE_ZONA } from '../domain/zonas';
import type { Almacen } from '../state/almacen';
import { bus } from '../state/bus';
import { useAlmacen } from '../state/useAlmacen';

const TIPO = { escritorio: 'Escritorio', mesa4: 'Mesa compartida de 4', reuniones: 'Mesa de reuniones' } as Record<string, string>;

/** Ficha del puesto seleccionado (escritorio o silla de una mesa compartida). */
export function FichaPuesto({ almacen, id }: { almacen: Almacen; id: string }) {
  const e = useAlmacen(almacen);
  const puesto = e.puestos[id];
  if (!puesto) return null;
  const ocupante = e.ordenAgentes.map((a) => e.agentes[a]!).find((a) => a.asientoId === id);

  return (
    <aside className="panel ficha" aria-label={`Ficha del puesto: ${etiquetaPuesto(puesto)}`}>
      <header>
        <div>
          <h2>{etiquetaPuesto(puesto)}</h2>
          <span className="sello">Puesto</span>
        </div>
        <button type="button" className="boton cerrar" aria-label="Cerrar ficha" onClick={() => almacen.seleccionar(null)}>✕</button>
      </header>
      <dl>
        <dt>Tipo</dt><dd>{TIPO[puesto.tipo] ?? puesto.tipo}</dd>
        <dt>Zona</dt><dd>{puesto.zona ? NOMBRE_ZONA[puesto.zona] : '—'}</dd>
        <dt>Asignado a</dt>
        <dd>{ocupante ? ocupante.nombre : puesto.tipo === 'reuniones' ? 'Se ocupa en las reuniones' : 'Libre (sin agente asignado)'}</dd>
      </dl>
      <div className="acciones">
        {ocupante && <button type="button" className="boton" onClick={() => almacen.seleccionar({ tipo: 'agente', id: ocupante.id })}>Ver agente</button>}
        {puesto.zona && <button type="button" className="boton" onClick={() => bus.emit('zona:ir', puesto.zona!)}>Ver su zona</button>}
      </div>
    </aside>
  );
}
