import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agente, Genero } from '../domain/agentes';
import { etiquetaPuesto } from '../domain/etiquetas';
import { MAX_NOMBRE, VARIANTES, puestosLibres, validarDatosAgente } from '../domain/gestionAgentes';
import type { Almacen } from '../state/almacen';
import type { Gestor } from '../state/gestor';
import { useAlmacen } from '../state/useAlmacen';
import { Previa } from './Previa';

interface Props { almacen: Almacen; gestor: Gestor; editar?: Agente; alCerrar(): void }

/** Formulario para crear un agente nuevo o editar uno existente. */
export function FormularioAgente({ almacen, gestor, editar, alCerrar }: Props) {
  const e = useAlmacen(almacen);
  const todos = useMemo(() => Object.values(e.puestos), [e.puestos]);
  const agentes = gestor.agentes();
  const libres = puestosLibres(todos, agentes, editar?.id);

  const [nombre, setNombre] = useState(editar?.nombre ?? '');
  const [asientoId, setAsientoId] = useState(editar?.asientoId ?? libres[0]?.id ?? '');
  const [genero, setGenero] = useState<Genero>(editar?.genero ?? 'f');
  const [variante, setVariante] = useState(editar?.variante ?? 0);
  const [errores, setErrores] = useState<string[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const pulsoEnFondo = useRef(false);
  useEffect(() => { entrada.current?.focus(); }, []);
  useEffect(() => {
    const alTeclear = (ev: KeyboardEvent) => { if (ev.key === 'Escape') alCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [alCerrar]);

  // etiquetas únicas: «Mesa compartida de Ingeniería · 1», «… · 2»
  const opciones = useMemo(() => {
    const cuenta: Record<string, number> = {};
    const total: Record<string, number> = {};
    for (const p of libres) total[etiquetaPuesto(p)] = (total[etiquetaPuesto(p)] ?? 0) + 1;
    return libres.map((p) => {
      const base = etiquetaPuesto(p);
      cuenta[base] = (cuenta[base] ?? 0) + 1;
      return { id: p.id, texto: total[base]! > 1 ? `${base} · ${cuenta[base]}` : base };
    });
  }, [libres]);

  const zona = todos.find((p) => p.id === asientoId)?.zona;
  const datos = { nombre, asientoId, genero, variante };

  const guardar = (ev: React.FormEvent) => {
    ev.preventDefault();
    const problemas = validarDatosAgente(datos, todos, agentes, editar?.id);
    if (problemas.length) { setErrores(problemas); return; }
    try {
      if (editar) gestor.editar(editar.id, datos); else gestor.crear(datos);
      alCerrar();
    } catch (error) {
      setErrores([error instanceof Error ? error.message : 'No se pudo guardar el agente.']);
    }
  };

  return (
    <div className="modal-fondo" role="presentation"
      onMouseDown={(ev) => { pulsoEnFondo.current = ev.target === ev.currentTarget; }}
      onClick={(ev) => { if (ev.target === ev.currentTarget && pulsoEnFondo.current) alCerrar(); }}>
      <form className="panel formulario" role="dialog" aria-modal="true" aria-labelledby="titulo-form" onSubmit={guardar}>
        <h2 id="titulo-form">{editar ? `Editar a ${editar.nombre}` : 'Nuevo agente'}</h2>

        <label htmlFor="f-nombre">Nombre</label>
        <input id="f-nombre" ref={entrada} type="text" value={nombre} maxLength={MAX_NOMBRE + 10} autoComplete="off"
          onChange={(ev) => { setNombre(ev.target.value); setErrores([]); }} aria-describedby={errores.length ? 'f-errores' : undefined} />

        <label htmlFor="f-puesto">Puesto de trabajo</label>
        <select id="f-puesto" value={asientoId} onChange={(ev) => { setAsientoId(ev.target.value); setErrores([]); }}>
          {opciones.length === 0 && <option value="">No quedan puestos libres</option>}
          {opciones.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
        </select>

        <fieldset>
          <legend>Persona</legend>
          <label className="opcion"><input type="radio" name="genero" checked={genero === 'f'} onChange={() => setGenero('f')} /> Chica</label>
          <label className="opcion"><input type="radio" name="genero" checked={genero === 'm'} onChange={() => setGenero('m')} /> Chico</label>
        </fieldset>

        <fieldset>
          <legend>Aspecto</legend>
          <div className="aspectos">
            {Array.from({ length: VARIANTES }, (_, v) => (
              <button key={v} type="button" className={`aspecto${variante === v ? ' activo' : ''}`} aria-pressed={variante === v}
                aria-label={`Aspecto ${v + 1}`} onClick={() => setVariante(v)}>
                <Previa variante={v} genero={genero} zona={zona} />
              </button>
            ))}
          </div>
        </fieldset>

        {errores.length > 0 && <ul id="f-errores" className="errores" role="alert">{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
        <p className="nota">Los agentes son simulados por ahora: cambian de estado solos.</p>
        <div className="acciones">
          <button type="submit" className="boton principal" disabled={opciones.length === 0}>Guardar</button>
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
