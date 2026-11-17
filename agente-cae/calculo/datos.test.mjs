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
  it('para el ACS derivado del CEE pide energía primaria de ACS, factor del combustible y rendimiento del certificado', () => {
    expect(ids({ calderaDaAcs: 'si' }, 99)).toEqual(expect.arrayContaining(['epAcsKwhM2', 'factorEP', 'etaCert']));
    expect(ids({ calderaDaAcs: 'no' }, 99)).not.toContain('epAcsKwhM2');
    const f = PREGUNTAS.find((p) => p.id === 'factorEP');
    expect(f.donde).toMatch(/no se inventa/i);
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

describe('climaDeZona: tabla oficial del Anexo III de la ficha RES060', () => {
  it('A3 a D3 → cálido; E1 → medio; una zona que no existe → null', () => {
    for (const z of ['A3', 'A4', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3']) expect(climaDeZona(z.toLowerCase())).toBe('calido');
    expect(climaDeZona('E1')).toBe('medio');
    expect(climaDeZona('Z9')).toBeNull();
    expect(climaDeZona('B1')).toBeNull();
  });
});

describe('factor de zona y tipos de caldera', () => {
  it('con la zona conocida no se pregunta el factor FC: sale de la tabla oficial', () => {
    const r = { zonaClimatica: 'D3', calderaDaAcs: 'si', acsTipo: 'deposito_aparte' };
    expect(ids(r, 99)).not.toContain('fcZona');
    expect(ids({ ...r, zonaClimatica: 'Z9' }, 99)).toContain('fcZona');
  });
  it('gas anterior a 1998: se pregunta el tipo de caldera, no la condensación ni el encendido', () => {
    const r = { superficieM2: 90, zonaClimatica: 'D3', dcalKwhM2: 60, combustible: 'gas', anioCaldera: '1990' };
    expect(ids(r, 20)).toContain('tipoCalderaGas');
    expect(ids(r, 20)).not.toContain('condensacion');
    expect(ids(r, 20)).not.toContain('encendido');
    expect(ids(r, 20)).not.toContain('etaIDirecto');
  });
  it('combustible sólido: alimentación y espacio; sin año', () => {
    const r = { superficieM2: 90, zonaClimatica: 'D3', dcalKwhM2: 60, combustible: 'solido' };
    expect(ids(r, 20)).toEqual(expect.arrayContaining(['alimentacion', 'espacioCaldera']));
    expect(ids(r, 20)).not.toContain('anioCaldera');
  });
  it('aEntrada calcula ηi para gas antiguo y para sólido', () => {
    const completas = { superficieM2: '100', zonaClimatica: 'D3', dcalKwhM2: '50', calderaDaAcs: 'no', unicoGenerador: 'si', temperaturaImpulsion: '55', etaSH: '1,78', retiradaCaldera: 'si' };
    expect(aEntrada({ ...completas, combustible: 'gas', anioCaldera: '1990', tipoCalderaGas: 'forzado_alta' }).entrada.etaI).toBe(0.68);
    expect(aEntrada({ ...completas, combustible: 'solido', alimentacion: 'automatica', espacioCaldera: 'calefactado' }).entrada.etaI).toBe(0.65);
  });
  it('la prueba de retirada admite también la condena física del equipo', () => {
    const q = PREGUNTAS.find((p) => p.id === 'retiradaCaldera');
    expect(q.pregunta + q.donde).toMatch(/condena/i);
  });
});

describe('aEntrada: de las respuestas al cálculo', () => {
  const completas = {
    superficieM2: '100', zonaClimatica: 'D3', dcalKwhM2: '50', combustible: 'gas', anioCaldera: '2005', condensacion: 'no', encendido: 'automatico',
    calderaDaAcs: 'si', litrosDia: '100', epAcsKwhM2: '18,89', factorEP: '1,179', etaCert: '0,648', unicoGenerador: 'si', temperaturaImpulsion: '55', etaSH: '1,78',
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
  it('la entrada lleva el ACS derivado del CEE y los litros como control', () => {
    const { entrada } = aEntrada(completas);
    expect(entrada.acs.derivado).toEqual({ epAcsKwhM2: 18.89, factorEP: 1.179, etaCert: 0.648 });
    expect(entrada.acs.litrosDia).toBe(100);
    expect(calcularRES060(entrada).dacsMetodo).toBe('derivado_cee');
  });
  it('el rendimiento del certificado se acepta como 0,648 o como 64,8 %', () => {
    expect(aEntrada({ ...completas, etaCert: '64,8' }).entrada.acs.derivado.etaCert).toBeCloseTo(0.648, 6);
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
  it('una zona que no está en la tabla del Anexo III se avisa como pendiente', () => {
    expect(aEntrada({ ...completas, zonaClimatica: 'Z9' }).pendientes.join(' ')).toMatch(/Anexo III/);
  });
  it('el factor FC sale de la tabla oficial de la zona aunque se escriba otro (y se avisa)', () => {
    const { entrada, pendientes } = aEntrada({ ...completas, fcZona: '1,2' });
    expect(entrada.acs.fcZona).toBe(1.113);
    expect(pendientes.join(' ')).toMatch(/FC/);
  });
});
