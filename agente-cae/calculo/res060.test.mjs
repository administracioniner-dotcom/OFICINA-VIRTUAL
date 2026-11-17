import { describe, expect, it } from 'vitest';
import { CONSTANTES, calcularRES060, dacs, etaICaldera, scopAcs, scopCalefaccion } from './res060.mjs';

describe('piezas de la fórmula RES060 V1.1 (según la guía interna)', () => {
  it('Dacs: 0,001162 × 46 × 365 = 19,50998 kWh por l/día (100 l/día = 1.951,0)', () => {
    expect(CONSTANTES.dacsPorLitroDia).toBeCloseTo(19.50998, 5);
    expect(dacs(100)).toBeCloseTo(1950.998, 3);
  });
  it('SCOP = 2,5 · (ηs,h + 0,03): casos 2 y 4 de la guía', () => {
    expect(scopCalefaccion(1.28)).toBeCloseTo(3.275, 6);
    expect(scopCalefaccion(1.78)).toBeCloseTo(4.525, 6);
  });
  it('SCOPdhw: conjunto = 2,5·ηwh; depósito aparte = COP(A7/W55) × FC de la zona', () => {
    expect(scopAcs({ tipo: 'conjunto', etaWh: 1.3 })).toBeCloseTo(3.25, 6);
    expect(scopAcs({ tipo: 'deposito_aparte', copA7W55: 2.84, fcZona: 1.113 })).toBeCloseTo(3.16092, 5);
    expect(scopAcs({ tipo: 'deposito_aparte', copA7W55: 2.98, fcZona: 1.113 })).toBeCloseTo(3.31674, 5);
  });
  it('el depósito aparte exige el factor de la zona: sin él, error claro (no se inventa)', () => {
    expect(() => scopAcs({ tipo: 'deposito_aparte', copA7W55: 2.84 })).toThrow(/fcZona/);
  });
  it('ηi por la tabla B.3: valores de la guía y «null» donde la guía no da dato', () => {
    expect(etaICaldera({ combustible: 'gasoleo', anio: 1980 })).toBe(0.65);
    expect(etaICaldera({ combustible: 'gasoleo', anio: 1990 })).toBe(0.7);
    expect(etaICaldera({ combustible: 'gasoleo', anio: 2005, condensacion: false })).toBe(0.79);
    expect(etaICaldera({ combustible: 'gasoleo', anio: 2005, condensacion: true })).toBe(0.83);
    expect(etaICaldera({ combustible: 'gas', anio: 2005, condensacion: false, encendido: 'piloto' })).toBe(0.69);
    expect(etaICaldera({ combustible: 'gas', anio: 2005, condensacion: false, encendido: 'automatico' })).toBe(0.73);
    expect(etaICaldera({ combustible: 'gas', anio: 2005, condensacion: true, encendido: 'piloto' })).toBe(0.79);
    expect(etaICaldera({ combustible: 'gas', anio: 2005, condensacion: true, encendido: 'automatico' })).toBe(0.83);
    expect(etaICaldera({ combustible: 'gas', anio: 1990, condensacion: false, encendido: 'piloto' })).toBeNull();
    expect(etaICaldera({ combustible: 'butano', anio: 2005 })).toBeNull();
  });
});

describe('calcularRES060', () => {
  // Ejemplo de ILUSTRACIÓN (no es un caso real): 100 m², Dcal 50, ηi 0,79, ηs,h 1,78 (SCOP 4,525), 100 l/día, SCOPdhw 3,31674
  const base = { superficieM2: 100, dcalKwhM2: 50, etaI: 0.79, etaSH: 1.78, acs: { litrosDia: 100, tipo: 'deposito_aparte', copA7W55: 2.98, fcZona: 1.113 } };
  const esperado = (100 * 50) * (1 / 0.79 - 1 / 4.525) + 1950.998 * (1 / 0.79 - 1 / (2.98 * 1.113));

  it('aplica AE = FP·[(Dcal·S)(1/ηi − 1/SCOP) + Dacs(1/ηi − 1/SCOPdhw)]·f y redondea al entero', () => {
    const r = calcularRES060(base);
    expect(r.aeSinRedondear).toBeCloseTo(esperado, 3);
    expect(r.ae).toBe(Math.round(esperado));
    expect(Number.isInteger(r.ae)).toBe(true);
  });
  it('la cobertura f reduce el resultado proporcionalmente', () => {
    const r = calcularRES060({ ...base, cobertura: 0.8341 });
    expect(r.aeSinRedondear).toBeCloseTo(esperado * 0.8341, 3);
  });
  it('sin ACS en la caldera se omite el término de Dacs', () => {
    const r = calcularRES060({ ...base, acs: null });
    expect(r.aeSinRedondear).toBeCloseTo(100 * 50 * (1 / 0.79 - 1 / 4.525), 3);
    expect(r.terminos.acs).toBe(0);
    expect(r.hipotesis.join(' ')).toMatch(/sin ACS/i);
  });
  it('el resultado enseña datos de entrada, fórmula, hipótesis, pendientes, documentación y riesgos', () => {
    const r = calcularRES060(base);
    expect(r.formula).toMatch(/AE = FP/);
    expect(r.datos.superficieM2).toBe(100);
    expect(r.scop).toBeCloseTo(4.525, 6);
    expect(r.scopdhw).toBeCloseTo(3.31674, 5);
    expect(r.dacs).toBeCloseTo(1950.998, 3);
    for (const k of ['hipotesis', 'pendientes', 'documentacion', 'riesgosReduccion']) expect(Array.isArray(r[k])).toBe(true);
    expect(r.documentacion.length).toBeGreaterThan(0);
    expect(r.riesgosReduccion.length).toBeGreaterThan(0);
    expect(r.tipoResultado).toMatch(/estimaci/i);
  });
  it('lo que se pasa como pendiente de confirmar aparece en el resultado', () => {
    const r = calcularRES060({ ...base, pendientes: ['Marca del interacumulador'] });
    expect(r.pendientes).toContain('Marca del interacumulador');
  });
  it('con cobertura menor que 100 % deja constancia de dónde sale el dato', () => {
    expect(calcularRES060({ ...base, cobertura: 0.8341 }).hipotesis.join(' ')).toMatch(/cobertura/i);
  });
  it('datos que faltan o no son números → error en español, no un 0 silencioso', () => {
    expect(() => calcularRES060({ ...base, superficieM2: undefined })).toThrow(/superficieM2/);
    expect(() => calcularRES060({ ...base, dcalKwhM2: '50' })).toThrow(/dcalKwhM2/);
    expect(() => calcularRES060({ ...base, etaI: 0 })).toThrow(/etaI/);
    expect(() => calcularRES060({ ...base, etaI: 1.2 })).toThrow(/etaI/);
    expect(() => calcularRES060({ ...base, etaSH: -1 })).toThrow(/etaSH/);
    expect(() => calcularRES060({ ...base, cobertura: 1.5 })).toThrow(/cobertura/);
    expect(() => calcularRES060({ ...base, acs: { litrosDia: -5, tipo: 'conjunto', etaWh: 1.3 } })).toThrow(/litrosDia/);
  });
  it('si la instalación nueva rinde peor que la caldera (ahorro negativo) lo avisa en lugar de ocultarlo', () => {
    const r = calcularRES060({ ...base, etaI: 0.99, etaSH: 0.2 });
    expect(r.ae).toBeLessThan(0);
    expect(r.pendientes.join(' ')).toMatch(/negativ/i);
  });
});
