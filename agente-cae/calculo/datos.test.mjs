import { describe, expect, it } from 'vitest';
import { PREGUNTAS, aEntrada, aNumero, climaDeZona, siguientesPreguntas } from './datos.mjs';
import { calcularRES060 } from './res060.mjs';

const ids = (r, n) => siguientesPreguntas(r, n).map((p) => p.id);

describe('aNumero: acepta coma o punto', () => {
  it('lee 1,78 / 1.78 / 1.234,5 / 1,234.5 y devuelve null si no es un número', () => {
    expect(aNumero('1,78')).toBe(1.78);
    expect(aNumero('1.78')).toBe(1.78);
    expect(aNumero('1.234,5')).toBe(1234.5);
    expect(aNumero('1,234.5')).toBe(1234.5);
    expect(aNumero(7)).toBe(7);
    expect(aNumero('12a')).toBeNull();
    expect(aNumero('')).toBeNull();
    expect(aNumero(undefined)).toBeNull();
  });
});

describe('cada pregunta dice de dónde sale el dato', () => {
  it('todas tienen texto, dónde conseguirlo y un id único', () => {
    expect(new Set(PREGUNTAS.map((p) => p.id)).size).toBe(PREGUNTAS.length);
    for (const p of PREGUNTAS) { expect(p.pregunta.length).toBeGreaterThan(5); expect(p.donde.length).toBeGreaterThan(5); }
  });
});

describe('siguientesPreguntas', () => {
  it('sin respuestas empieza por lo básico del CEE previo', () => {
    expect(ids({}, 3)).toEqual(['superficieM2', 'zonaClimatica', 'dcalKwhM2']);
  });
  it('no repite lo ya contestado (el 0 y el texto cuentan como respuesta)', () => {
    expect(ids({ superficieM2: '95', zonaClimatica: 'D3' }, 2)).toEqual(['dcalKwhM2', 'combustible']);
  });
  it('solo pregunta lo que aplica: año/condensación/encendido según el combustible', () => {
    const r = { superficieM2: 90, zonaClimatica: 'D3', dcalKwhM2: 60, combustible: 'gas' };
    expect(ids(r, 10)).toContain('encendido');
    expect(ids({ ...r, combustible: 'gasoleo' }, 10)).not.toContain('encendido');
    expect(ids({ ...r, combustible: 'butano_propano' }, 10)).toContain('etaIDirecto');
    expect(ids(r, 10)).not.toContain('etaIDirecto');
  });
  it('litros de ACS solo si la caldera daba ACS; cobertura solo si no era el único generador', () => {
    expect(ids({ calderaDaAcs: 'no' }, 99)).not.toContain('litrosDia');
    expect(ids({ calderaDaAcs: 'si' }, 99)).toContain('litrosDia');
    expect(ids({ unicoGenerador: 'si' }, 99)).not.toContain('cobertura');
    expect(ids({ unicoGenerador: 'no' }, 99)).toContain('cobertura');
  });
  it('ηwh si es conjunto; COP y factor de zona si el depósito va aparte', () => {
    const r = { calderaDaAcs: 'si' };
    expect(ids({ ...r, acsTipo: 'conjunto' }, 99)).toContain('etaWh');
    expect(ids({ ...r, acsTipo: 'conjunto' }, 99)).not.toContain('copA7W55');
    expect(ids({ ...r, acsTipo: 'deposito_aparte' }, 99)).toEqual(expect.arrayContaining(['copA7W55', 'fcZona']));
  });
  it('un valor no numérico en una pregunta numérica cuenta como no contestado', () => {
    expect(ids({ superficieM2: '12a' }, 1)).toEqual(['superficieM2']);
  });
});

describe('climaDeZona: solo lo que da la guía', () => {
  it('B4 y D3 → cálido, E1 → medio, el resto → null (hay que mirar la tabla del Anexo III)', () => {
    expect(climaDeZona('d3')).toBe('calido');
    expect(climaDeZona('B4')).toBe('calido');
    expect(climaDeZona('E1')).toBe('medio');
    expect(climaDeZona('C2')).toBeNull();
  });
});

describe('aEntrada: de las respuestas al cálculo', () => {
  const completas = {
    superficieM2: '100', zonaClimatica: 'D3', dcalKwhM2: '50', combustible: 'gas', anioCaldera: '2005', condensacion: 'no', encendido: 'automatico',
    calderaDaAcs: 'si', litrosDia: '100', unicoGenerador: 'si', temperaturaImpulsion: '55', etaSH: '1,78',
    acsTipo: 'deposito_aparte', copA7W55: '2,98', fcZona: '1,113', retiradaCaldera: 'si',
  };
  it('con todo contestado produce la entrada del calculador (ηi de la tabla B.3, coma decimal aceptada)', () => {
    const { entrada, pendientes } = aEntrada(completas);
    expect(entrada.etaI).toBe(0.73);
    expect(entrada.cobertura).toBe(1);
    expect(entrada.etaSH).toBe(1.78);
    expect(pendientes).toEqual([]);
    expect(calcularRES060(entrada).ae).toBeGreaterThan(0);
  });
  it('si la caldera no daba ACS, no hay término de ACS', () => {
    const { entrada } = aEntrada({ ...completas, calderaDaAcs: 'no' });
    expect(entrada.acs).toBeNull();
  });
  it('la cobertura se escribe en % (83,41) y se convierte', () => {
    expect(aEntrada({ ...completas, unicoGenerador: 'no', cobertura: '83,41' }).entrada.cobertura).toBeCloseTo(0.8341, 6);
  });
  it('si falta algo, lo dice con las preguntas que quedan (no calcula a ciegas)', () => {
    expect(() => aEntrada({ ...completas, etaSH: undefined })).toThrow(/etaSH/);
  });
  it('ηi directo cuando la tabla no lo cubre (butano/propano)', () => {
    const r = { ...completas, combustible: 'butano_propano', etaIDirecto: '0,75' };
    expect(aEntrada(r).entrada.etaI).toBe(0.75);
  });
  it('sin prueba de la retirada de la caldera queda como pendiente (no bloquea, se avisa)', () => {
    expect(aEntrada({ ...completas, retiradaCaldera: 'no' }).pendientes.join(' ')).toMatch(/retirada/i);
    expect(aEntrada({ ...completas, retiradaCaldera: 'no_se' }).pendientes.join(' ')).toMatch(/retirada/i);
  });
  it('si el clima/zona no está en la guía, avisa de que hay que consultar la tabla del Anexo III', () => {
    expect(aEntrada({ ...completas, zonaClimatica: 'C2' }).pendientes.join(' ')).toMatch(/Anexo III/);
  });
});
