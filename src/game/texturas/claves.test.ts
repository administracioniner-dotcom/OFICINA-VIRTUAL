import { describe, expect, it } from 'vitest';
import datos from '../../../data/plano-v1.json';
import { cargarPlano, zonaEn } from '../../domain/plano';
import { TEXTURAS_REQUERIDAS, claveObjeto, colorSilla } from './claves';

const p = cargarPlano(datos);

describe('colorSilla', () => {
  it('rojo en CAE y Desarrollo', () => {
    expect(colorSilla('cae')).toBe('rojo');
    expect(colorSilla('desarrollo')).toBe('rojo');
  });
  it('gris en Administración, Compras, Recepción, Dirección y Marketing', () => {
    for (const z of ['admin', 'compras', 'recepcion', 'direccion', 'marketing'] as const) expect(colorSilla(z)).toBe('gris');
  });
  it('naranja en Ingeniería', () => {
    expect(colorSilla('ingenieria')).toBe('naranja');
  });
  it('gris si no hay zona', () => {
    expect(colorSilla(undefined)).toBe('gris');
  });
});

describe('claveObjeto', () => {
  it('todo objeto del plano tiene una textura requerida', () => {
    for (const o of p.objetos) {
      const clave = claveObjeto(o, zonaEn(p, o.x, o.y)?.tipo);
      expect(TEXTURAS_REQUERIDAS, `${o.tipo} (${o.x},${o.y}) → ${clave}`).toContain(clave);
    }
  });
  it('mesa de reuniones: obj-mesa', () => {
    const o = p.objetos.find((x) => x.tipo === 'mesa')!;
    expect(claveObjeto(o, zonaEn(p, o.x, o.y)?.tipo)).toBe('obj-mesa');
  });
  it('escritorio de CAE rojo, de Compras gris, de Ingeniería naranja', () => {
    const e = (zona: string) => p.objetos.find((x) => x.tipo === 'escritorio' && zonaEn(p, x.x, x.y)?.tipo === zona)!;
    expect(claveObjeto(e('compras'), 'compras')).toBe('obj-escritorio-gris');
    expect(claveObjeto(e('ingenieria'), 'ingenieria')).toBe('obj-escritorio-naranja');
    expect(claveObjeto({ ...e('compras') }, 'cae')).toBe('obj-escritorio-rojo');
  });
  it('mesa de 4: naranja en Ingeniería e isla en el resto', () => {
    const m = p.objetos.filter((x) => x.tipo === 'mesa4');
    const claves = m.map((o) => claveObjeto(o, zonaEn(p, o.x, o.y)?.tipo)).sort();
    expect(claves).toEqual(['obj-mesa4-isla', 'obj-mesa4-naranja']);
  });
  it('muros, mamparas, ventanas y estanterías tienen textura', () => {
    for (const k of ['muro', 'muro-frente', 'mampara', 'ventana', 'estanteria', 'alfombra', 'suelo-0', 'suelo-3']) {
      expect(TEXTURAS_REQUERIDAS).toContain(k);
    }
  });
});
