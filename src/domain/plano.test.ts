import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { PlanoInvalido, cargarPlano, celdasAlcanzables, rejillaBloqueada, zonaEn } from './plano';

const base = () => JSON.parse(JSON.stringify(datos));

describe('cargarPlano', () => {
  it('carga el plano v1: 37x20 y 11 zonas', () => {
    const p = cargarPlano(datos);
    expect(p.ancho).toBe(37);
    expect(p.alto).toBe(20);
    expect(p.zonas).toHaveLength(11);
  });

  it('rechaza un plano vacío indicando que falta cuadricula', () => {
    expect(() => cargarPlano({})).toThrowError(PlanoInvalido);
    expect(() => cargarPlano({})).toThrowError(/cuadricula/);
  });

  it('rechaza una zona fuera del mapa nombrando la zona', () => {
    const d = base();
    d.zonas.push({ tipo: 'cae', x: 36, y: 19, ancho: 5, alto: 5 });
    expect(() => cargarPlano(d)).toThrowError(/zona.*cae/i);
  });

  it('rechaza un tipo de objeto desconocido nombrándolo', () => {
    const d = base();
    d.objetos.push({ tipo: 'nave', x: 1, y: 1, ancho: 1, alto: 1, giro: 0 });
    expect(() => cargarPlano(d)).toThrowError(/nave/);
  });

  it('rechaza un giro que no es 0, 90, 180 ni 270', () => {
    const d = base();
    d.objetos[0].giro = 45;
    expect(() => cargarPlano(d)).toThrowError(/giro/);
  });
});

describe('rejillaBloqueada', () => {
  const p = cargarPlano(datos);
  const r = rejillaBloqueada(p);

  it('la baldosa (6,19) tiene mampara y ventana a la vez y bloquea', () => {
    expect(r[19]![6]).toBe(true);
  });

  it('la entrada (10,0) está libre aunque esté en el muro norte', () => {
    expect(r[0]![10]).toBe(false);
    expect(r[0]![20]).toBe(false);
  });

  it('un muro bloquea', () => {
    expect(r[0]![0]).toBe(true);
  });

  it('un objeto «sobre» otro (microondas) no cuenta como obstáculo por sí solo', () => {
    const d = base();
    d.objetos = [{ tipo: 'microondas', x: 5, y: 5, ancho: 1, alto: 1, giro: 0, sobre: 'mesasola' }];
    expect(rejillaBloqueada(cargarPlano(d))[5]![5]).toBe(false);
  });

  it('un escritorio bloquea sus dos baldosas', () => {
    const e = p.objetos.find((o) => o.tipo === 'escritorio')!;
    expect(r[e.y]![e.x]).toBe(true);
    expect(r[e.y + e.alto - 1]![e.x + e.ancho - 1]).toBe(true);
  });
});

describe('celdasAlcanzables', () => {
  it('toda baldosa libre de cada zona se alcanza desde las entradas', () => {
    const p = cargarPlano(datos);
    const bloq = rejillaBloqueada(p);
    const alc = celdasAlcanzables(p);
    for (const z of p.zonas) {
      for (let y = z.y; y < z.y + z.alto; y++) {
        for (let x = z.x; x < z.x + z.ancho; x++) {
          if (!bloq[y]![x]) expect(alc[y]![x], `${z.tipo} (${x},${y})`).toBe(true);
        }
      }
    }
  });
});

describe('zonaEn', () => {
  const p = cargarPlano(datos);
  it('devuelve la zona que contiene la baldosa', () => {
    expect(zonaEn(p, 10, 3)?.tipo).toBe('ingenieria');
    expect(zonaEn(p, 31, 14)?.tipo).toBe('desarrollo');
    expect(zonaEn(p, 20, 15)?.tipo).toBe('direccion');
  });
  it('devuelve undefined en un pasillo', () => {
    expect(zonaEn(p, 20, 8)).toBeUndefined();
  });
});
