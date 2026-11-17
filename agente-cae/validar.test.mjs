import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarArchivo, validarCarpeta } from './validar.mjs';

const HOY = '2026-11-17';
const base = (extra = {}) => ({
  id: 'x-1', fecha_consulta: '2026-11-10', fuente: { nombre: 'BOE', url: 'https://www.boe.es/x', tipo: 'oficial' },
  fiabilidad: 'verificado', clasificacion: 'hecho', ...extra,
});
const normativa = (extra = {}) => base({
  titulo: 'Orden de ejemplo', estado: 'aprobada', fecha_publicacion: '2026-10-01', entrada_en_vigor: null,
  afecta_a: ['RES060'], impacto_iner: 'texto', oportunidades_riesgos: 'texto', ...extra,
});
const ficha = (extra = {}) => base({ id: 'f-1', codigo: 'RES060', denominacion: 'Ejemplo', sector: 'residencial', version: '1', fecha_ficha: '2025-01-01', formula_oficial: null, ...extra });
const errores = (nombre, datos) => validarArchivo(nombre, datos, HOY);

describe('validar registros del agente CAE', () => {
  it('un registro de normativa completo es válido', () => {
    expect(errores('normativa.json', [normativa()])).toEqual([]);
  });
  it('no es una lista → error; un fichero desconocido → error', () => {
    expect(errores('normativa.json', {})[0]).toMatch(/lista/);
    expect(errores('raro.json', [])[0]).toMatch(/desconocido/i);
  });
  it('la fecha de consulta es obligatoria, con formato AAAA-MM-DD y no futura', () => {
    expect(errores('normativa.json', [normativa({ fecha_consulta: undefined })]).join()).toMatch(/fecha_consulta/);
    expect(errores('normativa.json', [normativa({ fecha_consulta: '17/11/2026' })]).join()).toMatch(/fecha_consulta/);
    expect(errores('normativa.json', [normativa({ fecha_consulta: '2026-02-30' })]).join()).toMatch(/fecha_consulta/);
    expect(errores('normativa.json', [normativa({ fecha_consulta: '2026-12-01' })]).join()).toMatch(/futura/);
  });
  it('la fuente necesita nombre y un enlace http(s)', () => {
    expect(errores('normativa.json', [normativa({ fuente: undefined })]).join()).toMatch(/fuente/);
    expect(errores('normativa.json', [normativa({ fuente: { nombre: 'BOE', url: 'boe.es', tipo: 'oficial' } })]).join()).toMatch(/enlace/);
    expect(errores('normativa.json', [normativa({ fuente: { nombre: '', url: 'https://a.es', tipo: 'oficial' } })]).join()).toMatch(/nombre/);
    expect(errores('normativa.json', [normativa({ fuente: { nombre: 'x', url: 'https://a.es', tipo: 'rumor' } })]).join()).toMatch(/tipo/);
  });
  it('fiabilidad y clasificación solo admiten los valores definidos', () => {
    expect(errores('normativa.json', [normativa({ fiabilidad: 'seguro' })]).join()).toMatch(/fiabilidad/);
    expect(errores('normativa.json', [normativa({ clasificacion: 'opinion' })]).join()).toMatch(/clasificacion/);
  });
  it('los id no se repiten (evita duplicar novedades)', () => {
    expect(errores('normativa.json', [normativa(), normativa()]).join()).toMatch(/repetido/);
  });
  it('un borrador o consulta pública es válido como tal, pero un estado inventado no', () => {
    expect(errores('normativa.json', [normativa({ estado: 'borrador' })])).toEqual([]);
    expect(errores('normativa.json', [normativa({ estado: 'consulta_publica' })])).toEqual([]);
    expect(errores('normativa.json', [normativa({ estado: 'casi_aprobada' })]).join()).toMatch(/estado/);
  });
  it('una normativa aprobada necesita fecha de publicación', () => {
    expect(errores('normativa.json', [normativa({ fecha_publicacion: null })]).join()).toMatch(/fecha_publicacion/);
  });
  it('las fichas: residencial e industrial sí, terciario fuera de alcance, y el código no se repite', () => {
    expect(errores('fichas.json', [ficha()])).toEqual([]);
    expect(errores('fichas.json', [ficha({ sector: 'industrial' })])).toEqual([]);
    expect(errores('fichas.json', [ficha({ sector: 'terciario' })]).join()).toMatch(/sector/);
    expect(errores('fichas.json', [ficha(), ficha({ id: 'f-2' })]).join()).toMatch(/codigo.*repetido|repetido.*codigo/i);
  });
  it('una fórmula oficial solo puede ser texto copiado de la ficha o null (nunca inventada: se exige la fuente)', () => {
    expect(errores('fichas.json', [ficha({ formula_oficial: 'AE = x' })])).toEqual([]);
    expect(errores('fichas.json', [ficha({ formula_oficial: 5 })]).join()).toMatch(/formula_oficial/);
    expect(errores('fichas.json', [ficha({ formula_oficial: 'AE = x', fuente: { nombre: 'Blog', url: 'https://b.es', tipo: 'comercial' } })]).join()).toMatch(/formula_oficial.*oficial/);
  });
  it('los precios llevan precio, unidad, empresa', () => {
    const precio = (extra = {}) => base({ id: 'p-1', empresa: 'Acme', tipo_empresa: 'intermediario', actuacion: 'RES060', precio: 12.5, unidad: '€/CAE', condiciones: '', ...extra, fiabilidad: extra.fiabilidad ?? 'referencia_publica' });
    expect(errores('precios.json', [precio()])).toEqual([]);
    expect(errores('precios.json', [precio({ precio: '12' })]).join()).toMatch(/precio/);
    expect(errores('precios.json', [precio({ unidad: '€/kg' })]).join()).toMatch(/unidad/);
  });
  it('las oportunidades llevan descripción, potencial, dificultad y recomendación', () => {
    const op = (extra = {}) => base({ id: 'o-1', descripcion: 'd', potencial_comercial: 'alto', dificultad: 'media', recursos: 'r', recomendacion: 'x', estado: 'pendiente_revision', ...extra });
    expect(errores('oportunidades.json', [op()])).toEqual([]);
    expect(errores('oportunidades.json', [op({ recomendacion: undefined })]).join()).toMatch(/recomendacion/);
  });
});

describe('validarCarpeta', () => {
  it('valida todos los ficheros y junta los errores con el nombre del fichero', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cae-'));
    writeFileSync(join(dir, 'normativa.json'), JSON.stringify([normativa({ fiabilidad: 'x' })]));
    writeFileSync(join(dir, 'fichas.json'), '[]');
    writeFileSync(join(dir, 'roto.json'), '{no es json');
    const e = validarCarpeta(dir, HOY);
    expect(e.some((m) => m.startsWith('normativa.json') && m.includes('fiabilidad'))).toBe(true);
    expect(e.some((m) => m.startsWith('roto.json'))).toBe(true);
    expect(e.some((m) => m.startsWith('fichas.json'))).toBe(false);
  });
});

describe('fichas sin versión o fecha publicada (el catálogo web no siempre las da)', () => {
  const f = (extra = {}) => ({
    id: 'f-9', fecha_consulta: '2026-11-10', fuente: { nombre: 'MITECO', url: 'https://www.miteco.gob.es/x', tipo: 'oficial' },
    fiabilidad: 'verificado', clasificacion: 'hecho', codigo: 'RES060', denominacion: 'Ejemplo', sector: 'residencial',
    version: '1', fecha_ficha: '2025-01-01', formula_oficial: null, ...extra,
  });
  it('version y fecha_ficha pueden ser null (no publicadas); no se rellenan con la fecha de consulta', () => {
    expect(validarArchivo('fichas.json', [f({ version: null, fecha_ficha: null })], HOY)).toEqual([]);
  });
  it('pero si se indican tienen que ser válidas', () => {
    expect(validarArchivo('fichas.json', [f({ version: 5 })], HOY).join()).toMatch(/version/);
    expect(validarArchivo('fichas.json', [f({ fecha_ficha: '2025-02-30' })], HOY).join()).toMatch(/fecha_ficha/);
    expect(validarArchivo('fichas.json', [f({ version: '' })], HOY).join()).toMatch(/version/);
  });
});
