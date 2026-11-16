import { describe, expect, it } from 'vitest';
import { aspecto, PIELES } from './personaje';

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
});
