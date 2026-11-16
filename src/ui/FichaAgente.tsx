import { useEffect, useState } from 'react';
import { etiquetaPuesto, hace } from '../domain/etiquetas';
import { NOMBRE_ZONA } from '../domain/zonas';
import { COLOR_ESTADO, NOMBRE_ESTADO } from '../game/sprites/globos';
import type { Almacen } from '../state/almacen';
import { bus } from '../state/bus';
import { useAlmacen } from '../state/useAlmacen';

const NOMBRE_TAREA = { pendiente: 'Pendiente', en_curso: 'En curso', hecha: 'Hecha' } as const;

/** Ficha del agente seleccionado, con su ventana de tareas (todo simulado). */
export function FichaAgente({ almacen, id, alEditar, alQuitar }: { almacen: Almacen; id: string; alEditar(): void; alQuitar(): void }) {
  const e = useAlmacen(almacen);
  const agente = e.agentes[id];
  const [ahora, setAhora] = useState(() => Date.now());
  const [verTareas, setVerTareas] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => setConfirmando(false), [id]);
  if (!agente) return null;
  const puesto = e.puestos[agente.asientoId];
  const tareas = e.tareas[id] ?? [];
  const actividad = e.actividad.filter((a) => a.agenteId === id).slice(0, 5);

  return (
    <aside className="panel ficha" aria-label={`Ficha de ${agente.nombre}`}>
      <header>
        <span className="muestra" style={{ background: agente.camisa }} aria-hidden="true" />
        <div>
          <h2>{agente.nombre}</h2>
          <span className="sello">Simulado</span>
        </div>
        <button type="button" className="boton cerrar" aria-label="Cerrar ficha" onClick={() => almacen.seleccionar(null)}>✕</button>
      </header>
      <dl>
        <dt>Estado</dt>
        <dd><span className="pildora" style={{ ['--c' as string]: COLOR_ESTADO[agente.estado] }}>{NOMBRE_ESTADO[agente.estado]}</span></dd>
        <dt>Departamento</dt>
        <dd>{NOMBRE_ZONA[agente.departamento]}</dd>
        <dt>Puesto</dt>
        <dd>{puesto ? etiquetaPuesto(puesto) : '—'}</dd>
      </dl>
      <div className="acciones">
        <button type="button" className="boton" onClick={() => bus.emit('zona:ir', agente.departamento)}>Ver su zona</button>
        {puesto && <button type="button" className="boton" onClick={() => almacen.seleccionar({ tipo: 'puesto', id: puesto.id })}>Ver su puesto</button>}
        <button type="button" className="boton" onClick={alEditar}>Editar</button>
        <button type="button" className="boton peligro" onClick={() => setConfirmando(true)}>Quitar</button>
      </div>
      {confirmando && (
        <div className="confirmar" role="alertdialog" aria-label="Confirmar que se quita el agente">
          <p>¿Quitar a <strong>{agente.nombre}</strong> de la oficina?</p>
          <div className="acciones">
            <button type="button" className="boton peligro" onClick={alQuitar}>Sí, quitar</button>
            <button type="button" className="boton" onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <section className="ventana-tareas" aria-label="Tareas asignadas">
        <button type="button" className="boton plegable" aria-expanded={verTareas} onClick={() => setVerTareas(!verTareas)}>
          Tareas asignadas ({tareas.filter((t) => t.estado !== 'hecha').length} activas) {verTareas ? '▴' : '▾'}
        </button>
        {verTareas && (
          <ul>
            {tareas.map((t) => (
              <li key={t.id} className={`tarea ${t.estado}`}>
                <span className="marca" aria-hidden="true" />
                <span className="texto">{t.titulo}</span>
                <span className="etiqueta-tarea">{NOMBRE_TAREA[t.estado]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Actividad reciente">
        <h3>Actividad reciente</h3>
        {actividad.length === 0 ? <p className="vacio">Todavía no hay actividad.</p> : (
          <ul className="actividad">
            {actividad.map((a) => <li key={a.id}><span>{a.texto}</span><time>{hace(a.t, ahora)}</time></li>)}
          </ul>
        )}
      </section>
      <p className="aviso">Datos simulados: no hay ningún agente real conectado.</p>
    </aside>
  );
}
