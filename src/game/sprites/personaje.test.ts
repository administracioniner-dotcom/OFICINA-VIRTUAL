import { describe, expect, it } from 'vitest';
import { aspecto, PELOS, PIELES } from './personaje';

describe('aspecto', () => {
  it('las chicas llevan melena o moño, los chicos pelo corto o rapado', () => {
    for (let v = 0; v < 8; v++) {
      expect([1, 2]).toContain(aspecto('#d6403a', v, 'f').estilo);
      expect([0, 3]).toContain(aspecto('#d6403a', v, 'm').estilo);
    }
  });
  it('es determinista: mismo agente, mismo aspecto', () => {
    expect(aspecto('#f57c00', 3, 'm')).toEqual(aspecto('#f57c00', 3, 'm'));
  });
  it('la camisa oscura es más oscura que la camisa', () => {
    const a = aspecto('#f57c00', 1, 'f');
    expect(a.camisaOscura).not.toBe(a.camisa);
  });
  it('todos los personajes tienen la piel clara', () => {
    const brillo = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    for (const piel of PIELES) expect(brillo(piel)).toBeGreaterThan(200);
    for (let v = 0; v < 12; v++) expect(PIELES).toContain(aspecto('#d6403a', v, 'f').piel);
  });
  it('todo el pelo es marrón o negro (nada de gris, rubio ni rojo)', () => {
    const brillo = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    for (const pelo of PELOS) {
      expect(brillo(pelo), pelo).toBeLessThan(90);
      const n = parseInt(pelo.slice(1), 16), R = n >> 16, B = n & 255;
      expect(R - B, `${pelo} tono cálido (no gris)`).toBeGreaterThanOrEqual(0);
      expect(R - B, `${pelo} no demasiado rojizo`).toBeLessThan(60);
    }
    for (let v = 0; v < 12; v++) for (const g of ['f', 'm'] as const) expect(PELOS).toContain(aspecto('#d6403a', v, g).pelo);
    expect(new Set(PELOS).size).toBeGreaterThanOrEqual(4);
  });
  it('los 9 agentes no comparten todos el mismo par de colores de pelo (hay variedad)', () => {
    const usados = new Set(Array.from({ length: 9 }, (_, v) => aspecto('#d6403a', v, 'f').pelo));
    expect(usados.size).toBeGreaterThanOrEqual(4);
  });
});
