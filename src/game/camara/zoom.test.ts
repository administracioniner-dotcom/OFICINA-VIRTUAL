import { describe, expect, it } from 'vitest';
import { esArrastre, limitarCamara, nivelesZoom, zoomAjustar, zoomSiguiente, zoomTrasRedimensionar } from './zoom';

const mapa = { ancho: 592, alto: 320 };

describe('zoomAjustar', () => {
  it('es el mayor zoom con el que cabe el mapa entero', () => {
    expect(zoomAjustar({ ancho: 1480, alto: 800 }, mapa)).toBe(2.5);
    expect(zoomAjustar({ ancho: 1000, alto: 2000 }, mapa)).toBeCloseTo(1000 / 592);
  });
  it('con la ventana minimizada (0 × 0) no devuelve 0, NaN ni Infinity', () => {
    const z = zoomAjustar({ ancho: 0, alto: 0 }, mapa);
    expect(z).toBe(0.1);
    expect(Number.isFinite(zoomAjustar({ ancho: NaN, alto: 100 }, mapa))).toBe(true);
  });
});

describe('zoomSiguiente', () => {
  it('sube del mínimo a 3, 4 y 5, y se queda en 5', () => {
    expect(zoomSiguiente(2.5, 1, 2.5)).toBe(3);
    expect(zoomSiguiente(3, 1, 2.5)).toBe(4);
    expect(zoomSiguiente(4, 1, 2.5)).toBe(5);
    expect(zoomSiguiente(5, 1, 2.5)).toBe(5);
  });
  it('baja hasta el mínimo y no pasa de ahí', () => {
    expect(zoomSiguiente(3, -1, 2.5)).toBe(2.5);
    expect(zoomSiguiente(2.5, -1, 2.5)).toBe(2.5);
  });
  it('en monitores grandes (mínimo > 4) sigue habiendo pasos enteros por encima', () => {
    expect(nivelesZoom(4.06)).toEqual([4.06, 5, 6, 7]);
    expect(zoomSiguiente(4.06, 1, 4.06)).toBe(5);
    expect(zoomSiguiente(7, 1, 4.06)).toBe(7);
    expect(zoomSiguiente(5, -1, 4.06)).toBe(4.06);
  });
  it('con mínimo 3 hay 3, 4 y 5', () => {
    expect(nivelesZoom(3)).toEqual([3, 4, 5]);
  });
  it('con un mínimo pequeño incluye el nivel 2', () => {
    expect(zoomSiguiente(1, 1, 1)).toBe(2);
  });
});

describe('esArrastre', () => {
  it('un temblor de menos de 5 px no es arrastre', () => {
    expect(esArrastre(3, 3)).toBe(false);
    expect(esArrastre(0, 0)).toBe(false);
  });
  it('5 px o más sí es arrastre', () => {
    expect(esArrastre(5, 0)).toBe(true);
    expect(esArrastre(-4, 4)).toBe(true);
  });
});

describe('limitarCamara', () => {
  const vista = { ancho: 1480, alto: 800 };
  it('si el mapa cabe, lo centra', () => {
    expect(limitarCamara({ x: 0, y: 0 }, 2.5, vista, mapa)).toEqual({ x: 296, y: 160 });
  });
  it('con zoom 4 no deja ver fuera del mapa', () => {
    expect(limitarCamara({ x: 0, y: 0 }, 4, vista, mapa)).toEqual({ x: 185, y: 100 });
    expect(limitarCamara({ x: 999, y: 999 }, 4, vista, mapa)).toEqual({ x: 407, y: 220 });
  });
  it('un centro válido no se toca', () => {
    expect(limitarCamara({ x: 300, y: 150 }, 4, vista, mapa)).toEqual({ x: 300, y: 150 });
  });
});

describe('zoomTrasRedimensionar', () => {
  it('si estaba en «ver todo», sigue en «ver todo» con el nuevo mínimo', () => {
    expect(zoomTrasRedimensionar(2.5, 2.5, 2)).toBe(2);
    expect(zoomTrasRedimensionar(2.5, 2.5, 3)).toBe(3);
  });
  it('si estaba con más zoom, lo conserva salvo que quede por debajo del nuevo mínimo', () => {
    expect(zoomTrasRedimensionar(4, 2.5, 2)).toBe(4);
    expect(zoomTrasRedimensionar(3, 2.5, 3.4)).toBe(3.4);
  });
});
