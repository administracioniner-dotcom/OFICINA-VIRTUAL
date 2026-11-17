import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calcularRES060 } from './res060.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const tiene = (cmd, args) => { try { return spawnSync(cmd, args, { stdio: 'ignore' }).status === 0; } catch { return false; } };
const hayHerramientas = tiene('python3', ['-c', 'import openpyxl']) && (tiene('soffice', ['--version']) || tiene('libreoffice', ['--version']));
const soffice = tiene('soffice', ['--version']) ? 'soffice' : 'libreoffice';
const base = JSON.parse(readFileSync(join(aqui, 'ejemplos', 'caso-ficticio.json'), 'utf8'));

/** Genera el Excel, lo recalcula con LibreOffice y devuelve los valores y los errores de todas las celdas. */
function generarYRecalcular(caso) {
  const dir = mkdtempSync(join(tmpdir(), 'cae-xlsx-'));
  writeFileSync(join(dir, 'caso.json'), JSON.stringify(caso));
  execFileSync('python3', [join(aqui, 'generar_excel.py'), join(dir, 'caso.json'), join(dir, 'caso.xlsx')]);
  execFileSync(soffice, ['--headless', '--convert-to', 'xlsx', '--outdir', join(dir, 'recalc'), join(dir, 'caso.xlsx')], { stdio: 'ignore' });
  const salida = execFileSync('python3', ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
errs = []
for ws in wb:
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith('#'): errs.append(f'{ws.title}!{c.coordinate} {c.value}')
r = wb['Resumen']
ca = wb['Cálculo']
ctrl = sum(1 for row in ca.iter_rows() for c in row if isinstance(c.value, str) and c.value.startswith('Correcto') or isinstance(c.value, str) and c.value.startswith('Revisar') or isinstance(c.value, str) and c.value.startswith('Aviso'))
print(json.dumps({'hojas': wb.sheetnames, 'errores': errs, 'cae': r['D12'].value, 'controles': ctrl}))
`, join(dir, 'recalc', 'caso.xlsx')]).toString();
  return JSON.parse(salida);
}
const entrada = (d) => {
  const acs = d.acs && (d.acs.tipo === 'conjunto' ? { ...d.acs, etaWh: d.acs.etaWhPorcentaje / 100 } : d.acs);
  return { superficieM2: d.superficieM2, dcalKwhM2: d.dcalKwhM2, etaI: d.etaI, etaSH: d.etaShPorcentaje / 100, cobertura: d.cobertura, superficieCubiertaM2: d.superficieCubiertaM2, acs };
};

describe.skipIf(!hayHerramientas)('Excel de 4 hojas (fórmulas vivas)', () => {
  it('tiene las 4 hojas, sin errores, y el resultado coincide con el calculador (depósito aparte)', () => {
    const r = generarYRecalcular(base);
    expect(r.hojas).toEqual(['Resumen', 'Cálculo', 'Trazabilidad', 'Referencias']);
    expect(r.errores).toEqual([]);
    expect(r.cae).toBe(calcularRES060(entrada(base.datos)).ae);
  }, 120000);
  it('conjunto del mismo fabricante (ηwh) y cobertura menor que 100 %', () => {
    const caso = structuredClone(base);
    caso.datos.cobertura = 0.8341;
    caso.datos.acs = { tipo: 'conjunto', litrosDia: 100, etaWhPorcentaje: 130 };
    const r = generarYRecalcular(caso);
    expect(r.errores).toEqual([]);
    expect(r.cae).toBe(calcularRES060({ ...entrada(caso.datos), acs: { tipo: 'conjunto', litrosDia: 100, etaWh: 1.3 } }).ae);
  }, 120000);
  it('ACS derivado del CEE (método principal) con control de catálogo, y superficie cubierta', () => {
    const caso = structuredClone(base);
    delete caso.datos.cobertura;
    caso.datos.superficieCubiertaM2 = 80;
    caso.datos.acs = { tipo: 'deposito_aparte', litrosDia: 100, copA7W55: 2.98, fcZona: 1.113, derivado: { epAcsKwhM2: 18.89, factorEP: 1.179, etaCert: 0.648 } };
    const r = generarYRecalcular(caso);
    expect(r.errores).toEqual([]);
    expect(r.cae).toBe(calcularRES060(entrada(caso.datos)).ae);
    expect(r.controles).toBeGreaterThanOrEqual(2);
  }, 120000);
  it('solo calefacción (sin ACS)', () => {
    const caso = structuredClone(base);
    caso.datos.acs = null;
    const r = generarYRecalcular(caso);
    expect(r.errores).toEqual([]);
    expect(r.cae).toBe(calcularRES060(entrada(caso.datos)).ae);
  }, 120000);
});
