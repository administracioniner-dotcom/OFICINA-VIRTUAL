import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { cargarPlano } from '../domain/plano';
import { colocarRotulos, lineasRotulo, rectsObstaculo } from './rotulos';
import { TILE } from './paleta';

const p = cargarPlano(datos);
const rotulos = colocarRotulos(p);

const choca = (a: { x: number; y: number; ancho: number; alto: number }, b: typeof a, margen = 0) =>
  a.x < b.x + b.ancho + margen && b.x < a.x + a.ancho + margen && a.y < b.y + b.alto + margen && b.y < a.y + a.alto + margen;

describe('lineasRotulo', () => {
  it('parte «SALA DE REUNIONES» en dos líneas dentro de 88 px', () => {
    expect(lineasRotulo('SALA DE REUNIONES', 88)).toEqual(['SALA DE', 'REUNIONES']);
  });
  it('deja una sola línea si cabe', () => {
    expect(lineasRotulo('COMPRAS', 72)).toEqual(['COMPRAS']);
  });
});

describe('colocarRotulos', () => {
  it('hay un rótulo por zona', () => {
    expect(rotulos).toHaveLength(p.zonas.length);
  });
  it('ningún rótulo tapa un objeto, un muro, una ventana ni una estantería (así se ven las teles)', () => {
    for (const r of rotulos) {
      for (const o of rectsObstaculo(p)) {
        expect(choca(r, o), `${r.zona.tipo} choca con obstáculo en (${o.x},${o.y})`).toBe(false);
      }
    }
  });
  it('los rótulos no se tocan: al menos 4 px entre ellos', () => {
    for (let i = 0; i < rotulos.length; i++) {
      for (let j = i + 1; j < rotulos.length; j++) {
        expect(choca(rotulos[i]!, rotulos[j]!, 4), `${rotulos[i]!.zona.tipo} y ${rotulos[j]!.zona.tipo}`).toBe(false);
      }
    }
  });
  it('todos quedan dentro del mapa', () => {
    for (const r of rotulos) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.ancho).toBeLessThanOrEqual(p.ancho * TILE);
      expect(r.y + r.alto).toBeLessThanOrEqual(p.alto * TILE);
    }
  });
  it('las siglas de la isla van fuera: DES y MKT encima, CAE y ADM debajo', () => {
    const y = (t: string) => rotulos.find((r) => r.zona.tipo === t)!.y;
    expect(y('desarrollo')).toBeLessThan(14 * TILE);
    expect(y('marketing')).toBeLessThan(14 * TILE);
    expect(y('cae')).toBeGreaterThanOrEqual(18 * TILE);
    expect(y('admin')).toBeGreaterThanOrEqual(18 * TILE);
  });
});
