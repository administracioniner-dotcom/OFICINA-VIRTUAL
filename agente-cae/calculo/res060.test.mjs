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
  it('sin litros ni datos derivados no se puede calcular el ACS (error claro)', () => {
    expect(() => calcularRES060({ ...base, acs: { tipo: 'conjunto', etaWh: 1.3 } })).toThrow(/litrosDia|derivado/);
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

describe('Dacs derivado del CEE (método principal) y controles', () => {
  // Datos del Caso 2 de José (Excel validado): sale 8.931 CAE
  const caso2 = {
    superficieM2: 90.69, dcalKwhM2: 76.57, etaI: 0.79, etaSH: 1.28, cobertura: 1,
    acs: { tipo: 'conjunto', etaWh: 1.3, litrosDia: 112, derivado: { epAcsKwhM2: 42.38, factorEP: 1.179, etaCert: 0.724 } },
  };
  it('Dacs = EP_ACS ÷ f_EP × ηcert × S y reproduce el Caso 2 validado: 8.931', () => {
    const r = calcularRES060(caso2);
    expect(r.dacs).toBeCloseTo(2360.18, 1);
    expect(r.dacsMetodo).toBe('derivado_cee');
    expect(r.ae).toBe(8931);
  });
  it('control con la fórmula del catálogo: lo calcula y avisa si se separa más de un 3 %', () => {
    const c = calcularRES060(caso2).controles.find((x) => x.id === 'dacs_catalogo');
    expect(c.catalogoKwh).toBeCloseTo(112 * 19.50998, 2);
    expect(c.diferenciaPct).toBeCloseTo(-7.42, 1);
    expect(c.ok).toBe(false);
    const cercano = calcularRES060({ ...caso2, acs: { ...caso2.acs, litrosDia: 121 } }).controles.find((x) => x.id === 'dacs_catalogo');
    expect(cercano.ok).toBe(true);
  });
  it('sin litros no hay control de catálogo; solo con litros (sin derivado) se usa el catálogo', () => {
    const { litrosDia: _l, ...sinLitros } = caso2.acs;
    expect(calcularRES060({ ...caso2, acs: sinLitros }).controles.some((x) => x.id === 'dacs_catalogo')).toBe(false);
    expect(calcularRES060({ ...caso2, acs: { tipo: 'conjunto', etaWh: 1.3, litrosDia: 112 } }).dacsMetodo).toBe('catalogo');
  });
  it('datos derivados mal escritos → error que dice cuál', () => {
    expect(() => calcularRES060({ ...caso2, acs: { ...caso2.acs, derivado: { epAcsKwhM2: 42.38, etaCert: 0.724 } } })).toThrow(/factorEP/);
    expect(() => calcularRES060({ ...caso2, acs: { ...caso2.acs, derivado: { epAcsKwhM2: 42.38, factorEP: 1.179, etaCert: 1.5 } } })).toThrow(/etaCert/);
  });
  it('control de límite físico: el ahorro es menor que el consumo previo', () => {
    const c = calcularRES060(caso2).controles.find((x) => x.id === 'ahorro_vs_consumo');
    expect(c.ok).toBe(true);
    expect(c.valorPct).toBeGreaterThan(0);
    expect(c.valorPct).toBeLessThan(100);
  });
});

describe('SCOP con todos los decimales; el recorte solo se informa', () => {
  // Caso 1 de José: solo calefacción, f = 126,45/151,6, validado 12.213 con SCOP recortado a 4,07
  const caso1 = { superficieM2: 151.6, dcalKwhM2: 100.7, etaI: 0.83, etaSH: 1.6, superficieCubiertaM2: 126.45, acs: null };
  it('calcula con el SCOP completo (4,075 → 12.217) y la cobertura sale de la superficie cubierta', () => {
    const r = calcularRES060(caso1);
    expect(r.scop).toBeCloseTo(4.075, 6);
    expect(r.datos.cobertura).toBeCloseTo(126.45 / 151.6, 6);
    expect(r.ae).toBe(12217);
  });
  it('informa de cuánto bajaría si el verificador recortara el SCOP a 2 decimales (12.213, −4)', () => {
    const s = calcularRES060(caso1).sensibilidadRecorteScop;
    expect(s.scopRecortado).toBeCloseTo(4.07, 6);
    expect(s.ae).toBe(12213);
    expect(s.diferencia).toBe(-4);
  });
  it('la superficie cubierta no puede ser mayor que la total', () => {
    expect(() => calcularRES060({ ...caso1, superficieCubiertaM2: 200 })).toThrow(/superficieCubiertaM2/);
  });
});
