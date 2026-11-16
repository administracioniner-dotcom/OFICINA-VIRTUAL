import { describe, expect, it } from 'vitest';
import { decidirEspera, debeCederPaso } from './convivencia';

const yo = { id: 'b', x: 100, y: 100, dir: 'este' as const };

describe('debeCederPaso', () => {
  it('cede si otro, con prioridad, está justo delante', () => {
    expect(debeCederPaso(yo, [{ id: 'a', x: 116, y: 100 }])).toBe(true);
  });
  it('no cede si el otro está detrás, lejos o al lado', () => {
    expect(debeCederPaso(yo, [{ id: 'a', x: 84, y: 100 }])).toBe(false);
    expect(debeCederPaso(yo, [{ id: 'a', x: 160, y: 100 }])).toBe(false);
    expect(debeCederPaso(yo, [{ id: 'a', x: 100, y: 120 }])).toBe(false);
  });
  it('no cede ante quien tiene menos prioridad (así dos que se cruzan no se bloquean los dos)', () => {
    expect(debeCederPaso(yo, [{ id: 'c', x: 116, y: 100 }])).toBe(false);
  });
  it('funciona en las cuatro direcciones', () => {
    expect(debeCederPaso({ ...yo, dir: 'sur' }, [{ id: 'a', x: 100, y: 116 }])).toBe(true);
    expect(debeCederPaso({ ...yo, dir: 'norte' }, [{ id: 'a', x: 100, y: 84 }])).toBe(true);
    expect(debeCederPaso({ ...yo, dir: 'oeste' }, [{ id: 'a', x: 84, y: 100 }])).toBe(true);
  });
});

describe('decidirEspera', () => {
  it('espera mientras alguien le cierra el paso, pero como mucho 1,2 s (nunca se queda bloqueado)', () => {
    let acum = 0, esperas = 0;
    for (let i = 0; i < 40; i++) { const r = decidirEspera(true, acum, 0.1); acum = r.acum; if (r.espera) esperas++; }
    expect(esperas).toBeGreaterThanOrEqual(10);
    expect(esperas).toBeLessThanOrEqual(13);
  });
  it('si el paso está libre, avanza y reinicia la cuenta', () => {
    expect(decidirEspera(false, 0.9, 0.1)).toEqual({ espera: false, acum: 0 });
  });
});
