import { useEffect, useMemo, useRef, useState } from 'react';
import datos from '../../data/plano-v1.json';
import { crearAgentes, crearAgentesExtra, esReal, type Agente } from '../domain/agentes';
import { PlanoInvalido, cargarPlano } from '../domain/plano';
import { asientosDelPlano } from '../game/asientos';
import { crearJuego } from '../game/crearJuego';
import { FuenteClaudeCode } from '../source/claudeCode';
import { FuenteCompuesta } from '../source/compuesta';
import { SimuladorAgentes } from '../source/simulado';
import { crearAlmacen } from '../state/almacen';
import { crearGestor } from '../state/gestor';
import { CLAVE_AGENTES, cargarAgentes, type Almacenamiento } from '../state/persistencia';
import { useAlmacen } from '../state/useAlmacen';
import { BarraZonas } from './BarraZonas';
import { ErrorPlano } from './ErrorPlano';
import { FichaAgente } from './FichaAgente';
import { FormularioAgente } from './FormularioAgente';
import { MisAgentes } from './MisAgentes';
import { FichaPuesto } from './FichaPuesto';
import { Zoom } from './Zoom';

function memoria(): Almacenamiento {
  const d = new Map<string, string>();
  return { getItem: (k) => d.get(k) ?? null, setItem: (k, v) => { d.set(k, v); } };
}

/** `localStorage` si el navegador lo permite; si no, memoria (los cambios no se guardan) y `bloqueado`. */
function almacenamientoDelNavegador(): { almacenamiento: Almacenamiento; bloqueado: boolean } {
  try { const a = window.localStorage; a.getItem('x'); return { almacenamiento: a, bloqueado: false }; } catch { return { almacenamiento: memoria(), bloqueado: true }; }
}

function preparar() {
  try {
    const plano = cargarPlano(datos);
    const asientos = asientosDelPlano(plano);
    const base = crearAgentes(asientos);
    // ?agentes=14 añade agentes en los puestos libres (solo para probar el rendimiento; no se guarda)
    const estres = new URLSearchParams(window.location.search).get('agentes') === '14';
    const nav = estres ? { almacenamiento: memoria(), bloqueado: false } : almacenamientoDelNavegador();
    const almacenamiento = nav.almacenamiento;
    const inicial = estres ? [...base, ...crearAgentesExtra(asientos, base)] : cargarAgentes(almacenamiento, base, asientos);
    // ?velocidad=3 acelera la simulación (para pruebas)
    const escala = Number(new URLSearchParams(window.location.search).get('velocidad'));
    const sillas = asientos.filter((a) => a.tipo === 'reuniones').map((a) => a.id);
    const simulador = new SimuladorAgentes(inicial, sillas, Math.random, escala > 0 ? escala : 1);
    // Agentes reales: Claude Code avisa al puente local (servidor de Vite) y este nos lo cuenta por SSE
    const claude = new FuenteClaudeCode({
      crearFlujo: () => new EventSource('/api/oficina/flujo'),
      agentes: () => gestor.agentes(),
    });
    const fuente = new FuenteCompuesta([simulador, claude]);
    const almacen = crearAlmacen(fuente, asientos);
    const gestor = crearGestor({ almacenamiento, fuente: simulador, asientos, inicial, guardadoInicial: !nav.bloqueado });
    // si otra pestaña cambia la lista, esta la recoge en vez de pisarla al guardar
    const releer = () => cargarAgentes(almacenamiento, base, asientos);
    return { plano, fuente, almacen, gestor, releer, escuchaOtrasPestanas: !estres && !nav.bloqueado };
  } catch (e) {
    return { error: e instanceof PlanoInvalido ? e.message : `Error inesperado: ${String(e)}` };
  }
}

export function App() {
  const contenedor = useRef<HTMLDivElement>(null);
  const r = useMemo(preparar, []);

  useEffect(() => {
    if (!r.plano || !contenedor.current) return;
    const { plano, fuente, almacen } = r as Required<Pick<typeof r, 'plano' | 'fuente' | 'almacen'>>;
    let juego: ReturnType<typeof crearJuego> | undefined;
    let cancelado = false;
    document.fonts.load('16px "Press Start 2P"').finally(() => {
      if (!cancelado && contenedor.current) juego = crearJuego(contenedor.current, plano, fuente, almacen);
    });
    // Esc deselecciona, salvo que haya un formulario abierto (ese lo cierra él)
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) almacen.seleccionar(null); };
    window.addEventListener('keydown', alTeclear);
    const alCambiarOtraPestana = (e: StorageEvent) => { if (e.key === CLAVE_AGENTES && r.gestor && r.releer) r.gestor.sincronizar(r.releer()); };
    if (r.escuchaOtrasPestanas) window.addEventListener('storage', alCambiarOtraPestana);
    return () => { cancelado = true; window.removeEventListener('keydown', alTeclear); window.removeEventListener('storage', alCambiarOtraPestana); juego?.destroy(true); fuente.detener(); almacen.dispose(); };
  }, [r]);

  const [formulario, setFormulario] = useState<null | { editar?: Agente }>(null);
  if (r.error || !r.plano || !r.almacen || !r.gestor) return <ErrorPlano mensaje={r.error ?? 'No se pudo preparar la oficina.'} />;
  const { almacen, gestor } = r;
  return (
    <>
      <div ref={contenedor} id="juego" style={{ position: 'absolute', inset: 0 }} />
      <BarraZonas zonas={r.plano.zonas} />
      <Zoom />
      <MisAgentes almacen={almacen} gestor={gestor} alCrear={() => setFormulario({})} />
      <Fichas almacen={almacen} gestor={gestor} alEditar={(a) => setFormulario({ editar: a })} />
      {formulario && <FormularioAgente almacen={almacen} gestor={gestor} editar={formulario.editar} alCerrar={() => setFormulario(null)} />}
      <Marca almacen={almacen} />
    </>
  );
}

type Preparado = NonNullable<ReturnType<typeof preparar>['almacen']>;

function Fichas({ almacen, gestor, alEditar }: { almacen: Preparado; gestor: NonNullable<ReturnType<typeof preparar>['gestor']>; alEditar(a: Agente): void }) {
  const e = useAlmacen(almacen);
  const { seleccion } = e;
  if (!seleccion) return null;
  if (seleccion.tipo === 'puesto') return <FichaPuesto almacen={almacen} id={seleccion.id} />;
  const agente = e.agentes[seleccion.id];
  if (!agente) return null;
  return <FichaAgente almacen={almacen} id={seleccion.id} alEditar={() => alEditar(agente)} alQuitar={() => { gestor.quitar(seleccion.id); }} />;
}

function Marca({ almacen }: { almacen: Preparado }) {
  const e = useAlmacen(almacen);
  const reales = Object.values(e.agentes).filter(esReal).length;
  return <div className="panel marca">INER SMART Virtual Office · simulación{reales > 0 ? ` + ${reales} real${reales > 1 ? 'es' : ''}` : ''}</div>;
}
