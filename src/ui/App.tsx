import { useEffect, useMemo, useRef } from 'react';
import datos from '../../data/plano-v1.json';
import { PlanoInvalido, cargarPlano } from '../domain/plano';
import { crearJuego } from '../game/crearJuego';
import { ErrorPlano } from './ErrorPlano';

export function App() {
  const contenedor = useRef<HTMLDivElement>(null);
  const resultado = useMemo(() => {
    try {
      return { plano: cargarPlano(datos) };
    } catch (e) {
      return { error: e instanceof PlanoInvalido ? e.message : `Error inesperado: ${String(e)}` };
    }
  }, []);

  useEffect(() => {
    const plano = resultado.plano;
    if (!plano || !contenedor.current) return;
    let juego: ReturnType<typeof crearJuego> | undefined;
    let cancelado = false;
    document.fonts.load('8px "Press Start 2P"').finally(() => {
      if (!cancelado && contenedor.current) juego = crearJuego(contenedor.current, plano);
    });
    return () => { cancelado = true; juego?.destroy(true); };
  }, [resultado]);

  if (resultado.error) return <ErrorPlano mensaje={resultado.error} />;
  return <div ref={contenedor} id="juego" style={{ position: 'absolute', inset: 0 }} />;
}
