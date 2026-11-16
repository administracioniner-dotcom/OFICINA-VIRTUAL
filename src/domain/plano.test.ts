import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { buscarRuta } from './rutas';
import { PlanoInvalido, cargarPlano, celdasAlcanzables, mamparasVisibles, rejillaBloqueada, zonaEn } from './plano';

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

describe('mamparasVisibles', () => {
  it('no incluye las baldosas que también son ventana, como (6,19)', () => {
    const p = cargarPlano(datos);
    const v = mamparasVisibles(p);
    expect(v.some(([x, y]) => x === 6 && y === 19)).toBe(false);
    expect(v).toHaveLength(p.mamparas.length - 1);
  });
});

describe('Sala de reuniones: división de cristal con Descanso y puerta', () => {
  const p = cargarPlano(datos);
  const bloq = rejillaBloqueada(p);
  it('entre Descanso y la Sala hay una división: cristal y la tele cierran toda la fila 10', () => {
    for (const x of [1, 2, 3, 4, 5, 6]) expect(bloq[10]![x], `(${x},10)`).toBe(true);
  });
  it('la puerta de la Sala es un hueco de 2 baldosas en la pared de cristal este (x=6, filas 11 y 12)', () => {
    expect(bloq[11]![6]).toBe(false);
    expect(bloq[12]![6]).toBe(false);
    expect(bloq[13]![6]).toBe(true);
  });
  it('para ir de Descanso a la Sala hay que dar la vuelta por la puerta', () => {
    const ruta = buscarRuta(bloq, [3, 5], [3, 12])!;
    expect(ruta).not.toBeNull();
    expect(ruta.some(([x, y]) => x === 6 && (y === 11 || y === 12))).toBe(true);
    expect(ruta.length).toBeGreaterThan(14);
  });
  it('desde la entrada principal se llega a las sillas de la Sala por la puerta', () => {
    const ruta = buscarRuta(bloq, [20, 0], [5, 14])!;
    expect(ruta).not.toBeNull();
    expect(ruta.some(([x, y]) => x === 6 && (y === 11 || y === 12))).toBe(true);
  });
});
