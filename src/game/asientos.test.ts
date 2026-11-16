import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { cargarPlano, celdasAlcanzables, rejillaBloqueada } from '../domain/plano';
import { asientosDelPlano, profundidadSentado } from './asientos';

const p = cargarPlano(datos);
const asientos = asientosDelPlano(p);

describe('asientosDelPlano', () => {
  it('hay 22 asientos: 6 escritorios, 8 en mesas de 4 y 8 de reuniones', () => {
    expect(asientos).toHaveLength(22);
    expect(asientos.filter((a) => a.tipo === 'escritorio')).toHaveLength(6);
    expect(asientos.filter((a) => a.tipo === 'mesa4')).toHaveLength(8);
    expect(asientos.filter((a) => a.tipo === 'reuniones')).toHaveLength(8);
  });
  it('ids y posiciones únicos', () => {
    expect(new Set(asientos.map((a) => a.id)).size).toBe(22);
    expect(new Set(asientos.map((a) => `${a.x},${a.y}`)).size).toBe(22);
  });
  it('los 4 puestos de la isla caen en Desarrollo, Marketing, CAE y Administración', () => {
    const isla = asientos.filter((a) => a.tipo === 'mesa4' && a.zona !== 'ingenieria').map((a) => a.zona).sort();
    expect(isla).toEqual(['admin', 'cae', 'desarrollo', 'marketing']);
  });
  it('el reparto de escritorios por departamento es Dirección 2, Ingeniería 2, Compras 1, Recepción 1', () => {
    const cuenta: Record<string, number> = {};
    for (const a of asientos.filter((x) => x.tipo === 'escritorio')) cuenta[a.zona ?? '?'] = (cuenta[a.zona ?? '?'] ?? 0) + 1;
    expect(cuenta).toEqual({ direccion: 2, ingenieria: 2, compras: 1, recepcion: 1 });
  });
  it('la silla de un escritorio con giro 0 está al sur y la persona mira al norte', () => {
    const e = p.objetos.find((o) => o.tipo === 'escritorio' && o.giro === 0)!;
    const a = asientos.find((s) => s.tipo === 'escritorio' && s.objeto.x === e.x && s.objeto.y === e.y)!;
    expect(a.lado).toBe('sur');
    expect(a.mira).toBe('norte');
  });
  it('las sillas del oeste de una mesa miran al este y las del este al oeste', () => {
    for (const a of asientos.filter((s) => s.tipo !== 'escritorio')) {
      expect(a.mira).toBe(a.lado === 'oeste' ? 'este' : 'oeste');
    }
  });
  it('la baldosa de acceso de cada asiento está libre y se alcanza desde las entradas', () => {
    const bloq = rejillaBloqueada(p);
    const alc = celdasAlcanzables(p);
    for (const a of asientos) {
      const [x, y] = a.acceso;
      expect(bloq[y]![x], `${a.id} acceso (${x},${y})`).toBe(false);
      expect(alc[y]![x], `${a.id} acceso (${x},${y}) alcanzable`).toBe(true);
    }
  });
  it('«fondo» es el borde inferior del mueble en píxeles (para ordenar por profundidad)', () => {
    for (const a of asientos) {
      const o = p.objetos.find((x) => x.x === a.objeto.x && x.y === a.objeto.y && ['escritorio', 'mesa', 'mesa4'].includes(x.tipo))!;
      expect(a.fondo).toBe((o.y + o.alto) * 32);
    }
  });
  it('profundidadSentado: detrás de la mesa si la silla está al norte; delante si está al sur o a un lado', () => {
    for (const a of asientos) expect(profundidadSentado(a)).toBe(a.lado === 'norte' ? a.fondo - 0.5 : a.fondo + 0.5);
  });
});
