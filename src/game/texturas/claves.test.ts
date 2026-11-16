import { describe, expect, it } from 'vitest';
import datos from '../../../data/plano-v1.json';
import { cargarPlano, zonaEn } from '../../domain/plano';
import { TEXTURAS_REQUERIDAS, claveObjeto, colorSilla, texturaObjeto } from './claves';

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
    for (const k of ['muro-0', 'muro-15', 'mampara', 'ventana', 'estanteria', 'alfombra', 'suelo-0', 'suelo-3']) {
      expect(TEXTURAS_REQUERIDAS).toContain(k);
    }
  });
});

describe('texturaObjeto', () => {
  const textura = (tipo: string, giro?: number) => {
    const o = p.objetos.find((x) => x.tipo === tipo && (giro === undefined || x.giro === giro))!;
    return texturaObjeto(o, zonaEn(p, o.x, o.y)?.tipo);
  };
  it('todo objeto del plano usa una textura que existe', () => {
    for (const o of p.objetos) {
      const { clave } = texturaObjeto(o, zonaEn(p, o.x, o.y)?.tipo);
      expect(TEXTURAS_REQUERIDAS, `${o.tipo} (${o.x},${o.y}) giro ${o.giro}`).toContain(clave);
    }
  });
  it('los escritorios vienen ya girados: la pantalla se ve derecha y la escena no los gira', () => {
    for (const o of p.objetos.filter((x) => x.tipo === 'escritorio')) {
      const r = texturaObjeto(o, zonaEn(p, o.x, o.y)?.tipo);
      expect(r.clave.endsWith(`-${o.giro}`)).toBe(true);
      expect(r.angulo).toBe(0);
    }
  });
  it('las mesas de 4, la mesa de reuniones y las teles también vienen giradas', () => {
    expect(textura('mesa4', 90)).toEqual({ clave: expect.stringMatching(/^obj-mesa4-(isla|naranja)-90$/), angulo: 0 });
    expect(textura('mesa', 90)).toEqual({ clave: 'obj-mesa-90', angulo: 0 });
    expect(textura('tele', 180)).toEqual({ clave: 'obj-tele-180', angulo: 0 });
  });
  it('lo demás sigue girándose en la escena (patinete 270°)', () => {
    expect(textura('patinete')).toEqual({ clave: 'obj-patinete', angulo: 270 });
  });
  it('un giro sin textura propia vuelve a la textura base girada', () => {
    const o = { ...p.objetos.find((x) => x.tipo === 'tele')!, giro: 90 as const };
    expect(texturaObjeto(o, undefined)).toEqual({ clave: 'obj-tele', angulo: 90 });
  });
});
