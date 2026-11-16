import { describe, expect, it } from 'vitest';
import { esClicEnLienzo } from './clic';

const lienzo = {};
describe('esClicEnLienzo', () => {
  it('un clic izquierdo corto que acaba sobre el lienzo vale', () => {
    expect(esClicEnLienzo({ button: 0, distancia: 0, upElement: lienzo }, lienzo)).toBe(true);
    expect(esClicEnLienzo({ button: 0, distancia: 4, upElement: lienzo }, lienzo)).toBe(true);
  });
  it('un arrastre (5 px o más) no vale', () => {
    expect(esClicEnLienzo({ button: 0, distancia: 5, upElement: lienzo }, lienzo)).toBe(false);
  });
  it('otro botón del ratón no vale', () => {
    expect(esClicEnLienzo({ button: 2, distancia: 0, upElement: lienzo }, lienzo)).toBe(false);
  });
  it('soltar sobre una ficha o un botón (fuera del lienzo) no cuenta como clic en el mapa', () => {
    expect(esClicEnLienzo({ button: 0, distancia: 0, upElement: {} }, lienzo)).toBe(false);
    expect(esClicEnLienzo({ button: 0, distancia: 0, upElement: null }, lienzo)).toBe(false);
  });
});
