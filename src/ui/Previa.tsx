import { useEffect, useRef } from 'react';
import { camisaDeDepartamento, type Genero } from '../domain/agentes';
import type { TipoZona } from '../domain/plano';
import { ALTO_FOTOGRAMA, ANCHO_FOTOGRAMA, aspecto, dibujarPersonaje } from '../game/sprites/personaje';

/** Dibuja un personaje (de frente) para elegir su aspecto. */
export function Previa({ variante, genero, zona, escala = 3 }: { variante: number; genero: Genero; zona?: TipoZona; escala?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, ANCHO_FOTOGRAMA, ALTO_FOTOGRAMA);
    c.imageSmoothingEnabled = false;
    dibujarPersonaje(c, 0, 0, aspecto(zona ? camisaDeDepartamento(zona) : '#5c6bc0', variante, genero), 'sur', 0, false);
  }, [variante, genero, zona]);
  return <canvas ref={ref} width={ANCHO_FOTOGRAMA} height={ALTO_FOTOGRAMA} style={{ width: ANCHO_FOTOGRAMA * escala, height: ALTO_FOTOGRAMA * escala, imageRendering: 'pixelated' }} aria-hidden="true" />;
}
