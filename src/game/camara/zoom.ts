export interface Tam { ancho: number; alto: number }
export interface Punto { x: number; y: number }

const ZOOM_MINIMO_ABSOLUTO = 0.1;

/** Mayor zoom con el que el mapa cabe entero en la vista (nunca 0, NaN ni Infinity). */
export function zoomAjustar(vista: Tam, mapa: Tam): number {
  const z = Math.min(vista.ancho / mapa.ancho, vista.alto / mapa.alto);
  return Number.isFinite(z) && z > ZOOM_MINIMO_ABSOLUTO ? z : ZOOM_MINIMO_ABSOLUTO;
}

/**
 * Niveles disponibles: el mínimo («ver todo») y después pasos enteros (2×, 3×, 4×…) por encima.
 * En pantallas grandes, donde el mínimo ya pasa de 2, siguen existiendo dos pasos enteros más.
 */
export function nivelesZoom(minimo: number): number[] {
  const tope = Math.max(4, Math.ceil(minimo) + 2);
  const niveles = [minimo];
  for (let n = 2; n <= tope; n++) if (n > minimo + 1e-6) niveles.push(n);
  return niveles;
}

export function zoomSiguiente(actual: number, direccion: 1 | -1, minimo: number): number {
  const niveles = nivelesZoom(minimo);
  const eps = 1e-6;
  if (direccion === 1) return niveles.find((n) => n > actual + eps) ?? niveles[niveles.length - 1]!;
  const menores = niveles.filter((n) => n < actual - eps);
  return menores.length ? menores[menores.length - 1]! : niveles[0]!;
}

/** Zoom tras cambiar el tamaño de la ventana: si estaba en «ver todo», sigue en «ver todo». */
export function zoomTrasRedimensionar(actual: number, minimoAnterior: number, minimoNuevo: number): number {
  if (Math.abs(actual - minimoAnterior) < 1e-6) return minimoNuevo;
  return Math.max(actual, minimoNuevo);
}

/** Nivel más grande que cabe para ver un rectángulo entero con margen. */
export function zoomParaRect(vista: Tam, rect: Tam, minimo: number, margen = 24): number {
  const ajuste = Math.min(vista.ancho / (rect.ancho + margen), vista.alto / (rect.alto + margen));
  const validos = nivelesZoom(minimo).filter((n) => n <= ajuste + 1e-6);
  return validos.length ? validos[validos.length - 1]! : minimo;
}

/** Centro de cámara (en píxeles del mapa) sin salirse del mapa; si el mapa cabe, lo centra. */
export function limitarCamara(centro: Punto, zoom: number, vista: Tam, mapa: Tam): Punto {
  const eje = (c: number, vistaPx: number, mapaPx: number) => {
    const mitad = vistaPx / zoom / 2;
    if (mitad * 2 >= mapaPx) return mapaPx / 2;
    return Math.min(Math.max(c, mitad), mapaPx - mitad);
  };
  return { x: eje(centro.x, vista.ancho, mapa.ancho), y: eje(centro.y, vista.alto, mapa.alto) };
}

export function esArrastre(dx: number, dy: number, umbral = 5): boolean {
  return Math.hypot(dx, dy) >= umbral;
}
