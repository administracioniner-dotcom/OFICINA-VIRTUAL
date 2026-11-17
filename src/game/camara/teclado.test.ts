import { describe, expect, it } from 'vitest';
import { esCampoDeTexto } from './teclado';

describe('esCampoDeTexto: ¿se está escribiendo en un formulario?', () => {
  it('campos de texto, áreas de texto, listas y elementos editables sí', () => {
    expect(esCampoDeTexto({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'input', type: 'search' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'INPUT' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'TEXTAREA' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'SELECT' })).toBe(true);
    expect(esCampoDeTexto({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
  it('botones, casillas, radios y el propio lienzo no: ahí WASD sigue moviendo la cámara', () => {
    expect(esCampoDeTexto({ tagName: 'BUTTON' })).toBe(false);
    expect(esCampoDeTexto({ tagName: 'INPUT', type: 'radio' })).toBe(false);
    expect(esCampoDeTexto({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(esCampoDeTexto({ tagName: 'CANVAS' })).toBe(false);
    expect(esCampoDeTexto({ tagName: 'BODY' })).toBe(false);
    expect(esCampoDeTexto(null)).toBe(false);
  });
});
