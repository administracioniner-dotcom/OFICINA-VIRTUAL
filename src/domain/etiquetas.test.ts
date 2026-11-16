import { describe, expect, it } from 'vitest';
import { etiquetaPuesto, hace } from './etiquetas';

describe('etiquetaPuesto', () => {
  it('escritorio: «Escritorio de <departamento>»', () => {
    expect(etiquetaPuesto({ id: 'a', tipo: 'escritorio', zona: 'compras' })).toBe('Escritorio de Compras');
    expect(etiquetaPuesto({ id: 'a', tipo: 'escritorio', zona: 'direccion' })).toBe('Escritorio de Dirección');
  });
  it('mesa de 4: la de Ingeniería y los puestos de la isla', () => {
    expect(etiquetaPuesto({ id: 'a', tipo: 'mesa4', zona: 'ingenieria' })).toBe('Mesa compartida de Ingeniería');
    expect(etiquetaPuesto({ id: 'a', tipo: 'mesa4', zona: 'cae' })).toBe('Puesto de CAE en la mesa compartida');
  });
  it('sala de reuniones', () => {
    expect(etiquetaPuesto({ id: 'a', tipo: 'reuniones', zona: 'reuniones' })).toBe('Silla de la sala de reuniones');
  });
  it('sin zona no rompe', () => {
    expect(etiquetaPuesto({ id: 'a', tipo: 'escritorio' })).toBe('Escritorio');
  });
});

describe('hace', () => {
  it('segundos, minutos y «ahora mismo»', () => {
    expect(hace(10_000, 10_500)).toBe('ahora mismo');
    expect(hace(10_000, 22_000)).toBe('hace 12 s');
    expect(hace(0, 125_000)).toBe('hace 2 min');
  });
  it('un reloj que va hacia atrás no da números negativos', () => {
    expect(hace(10_000, 5_000)).toBe('ahora mismo');
  });
});
