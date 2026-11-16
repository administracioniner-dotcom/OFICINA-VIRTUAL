import { useEffect, useMemo, useRef } from 'react';
import datos from '../../data/plano-v1.json';
import { crearAgentes, crearAgentesExtra } from '../domain/agentes';
import { PlanoInvalido, cargarPlano } from '../domain/plano';
import { asientosDelPlano } from '../game/asientos';
import { crearJuego } from '../game/crearJuego';
import { SimuladorAgentes } from '../source/simulado';
import { crearAlmacen } from '../state/almacen';
import { useAlmacen } from '../state/useAlmacen';
import { BarraZonas } from './BarraZonas';
import { ErrorPlano } from './ErrorPlano';
import { FichaAgente } from './FichaAgente';
import { FichaPuesto } from './FichaPuesto';
import { Zoom } from './Zoom';

function preparar() {
  try {
    const plano = cargarPlano(datos);
    const asientos = asientosDelPlano(plano);
    const base = crearAgentes(asientos);
    // ?agentes=14 añade agentes en los puestos libres (solo para probar el rendimiento)
    const agentes = new URLSearchParams(window.location.search).get('agentes') === '14' ? [...base, ...crearAgentesExtra(asientos, base)] : base;
    const sillas = asientos.filter((a) => a.tipo === 'reuniones').map((a) => a.id);
    // ?velocidad=3 acelera la simulación (para pruebas)
    const escala = Number(new URLSearchParams(window.location.search).get('velocidad'));
    const fuente = new SimuladorAgentes(agentes, sillas, Math.random, escala > 0 ? escala : 1);
    const almacen = crearAlmacen(fuente, asientos);
    return { plano, fuente, almacen };
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
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') almacen.seleccionar(null); };
    window.addEventListener('keydown', alTeclear);
    return () => { cancelado = true; window.removeEventListener('keydown', alTeclear); juego?.destroy(true); fuente.detener(); almacen.dispose(); };
  }, [r]);

  if (r.error || !r.plano || !r.almacen) return <ErrorPlano mensaje={r.error ?? 'No se pudo preparar la oficina.'} />;
  return (
    <>
      <div ref={contenedor} id="juego" style={{ position: 'absolute', inset: 0 }} />
      <BarraZonas zonas={r.plano.zonas} />
      <Zoom />
      <Fichas almacen={r.almacen} />
      <div className="panel marca">INER SMART Virtual Office · simulación</div>
    </>
  );
}

function Fichas({ almacen }: { almacen: NonNullable<ReturnType<typeof preparar>['almacen']> }) {
  const { seleccion } = useAlmacen(almacen);
  if (!seleccion) return null;
  return seleccion.tipo === 'agente' ? <FichaAgente almacen={almacen} id={seleccion.id} /> : <FichaPuesto almacen={almacen} id={seleccion.id} />;
}
