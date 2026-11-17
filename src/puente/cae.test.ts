import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resumirConocimiento } from './cae';

function carpeta(ficheros: Record<string, unknown> = {}, informes: string[] = []) {
  const d = mkdtempSync(join(tmpdir(), 'cae-panel-'));
  mkdirSync(join(d, 'conocimiento')); mkdirSync(join(d, 'informes'));
  for (const [n, v] of Object.entries(ficheros)) writeFileSync(join(d, 'conocimiento', n), typeof v === 'string' ? v : JSON.stringify(v));
  for (const i of informes) writeFileSync(join(d, 'informes', i), '# informe');
  return d;
}

describe('resumirConocimiento (panel del agente CAE)', () => {
  it('si la carpeta no existe: no disponible y todo a cero', () => {
    const r = resumirConocimiento(join(tmpdir(), 'no-existe-' + Date.now()));
    expect(r.disponible).toBe(false);
    expect(r.fichas.total).toBe(0);
  });
  it('carpeta vacía: disponible, sin datos ni informe', () => {
    const r = resumirConocimiento(carpeta({ 'fichas.json': [], 'normativa.json': [] }));
    expect(r.disponible).toBe(true);
    expect(r).toMatchObject({ fichas: { total: 0 }, normativa: { total: 0 }, alertas: 0, ultimaConsulta: null, ultimoInforme: null });
  });
  it('cuenta fichas por sector, con versión y de la serie S', () => {
    const f = [
      { codigo: 'RES060', sector: 'residencial', version: 'V1.1', fecha_consulta: '2026-11-17' },
      { codigo: 'RES060S', sector: 'residencial', version: null, programa: 'pobreza_energetica_serie_S', fecha_consulta: '2026-11-17' },
      { codigo: 'IND040', sector: 'industrial', version: null, fecha_consulta: '2026-11-10' },
    ];
    const r = resumirConocimiento(carpeta({ 'fichas.json': f }));
    expect(r.fichas).toEqual({ total: 3, residencial: 2, industrial: 1, conVersion: 1, serieS: 1 });
    expect(r.ultimaConsulta).toBe('2026-11-17');
  });
  it('normativa: aprobadas, en consulta y la última publicación', () => {
    const n = [
      { estado: 'aprobada', fecha_publicacion: '2026-08-04', fecha_consulta: '2026-11-17' },
      { estado: 'aprobada', fecha_publicacion: '2026-11-11', fecha_consulta: '2026-11-17' },
      { estado: 'consulta_publica', fecha_publicacion: null, fecha_consulta: '2026-11-17' },
    ];
    expect(resumirConocimiento(carpeta({ 'normativa.json': n })).normativa).toEqual({ total: 3, aprobadas: 2, enConsulta: 1, ultimaPublicacion: '2026-11-11' });
  });
  it('alertas recientes (hasta 3, recortadas) y oportunidades pendientes', () => {
    const a = Array.from({ length: 5 }, (_, i) => ({ titulo: `Alerta ${i} ` + 'x'.repeat(300), fecha_consulta: `2026-11-1${i}` }));
    const o = [{ descripcion: 'Una', estado: 'pendiente_revision' }, { descripcion: 'Dos', estado: 'revisada' }];
    const r = resumirConocimiento(carpeta({ 'alertas.json': a, 'oportunidades.json': o }));
    expect(r.alertas).toBe(5);
    expect(r.alertasRecientes).toHaveLength(3);
    expect(r.alertasRecientes[0]!.length).toBeLessThanOrEqual(140);
    expect(r.oportunidades).toEqual({ total: 2, pendientes: 1 });
  });
  it('el último informe es el de fecha más reciente; ignora lo que no sea un informe', () => {
    const r = resumirConocimiento(carpeta({}, ['2026-11-10-semanal.md', '2026-11-17-semanal.md', 'ultima-ejecucion.log', '.gitkeep', '2026-11-12-oportunidad-x.md']));
    expect(r.ultimoInforme).toEqual({ nombre: '2026-11-17-semanal.md', fecha: '2026-11-17' });
  });
  it('un fichero roto se avisa en «problemas» y no rompe el resto', () => {
    const r = resumirConocimiento(carpeta({ 'fichas.json': '{no es json', 'normativa.json': [{ estado: 'aprobada', fecha_publicacion: '2026-01-01', fecha_consulta: '2026-01-02' }] }));
    expect(r.problemas).toEqual(['fichas.json']);
    expect(r.normativa.total).toBe(1);
  });
  it('no devuelve contenido de las fichas ni fórmulas, solo recuentos y títulos cortos', () => {
    const f = [{ codigo: 'RES060', sector: 'residencial', version: 'V1.1', formula_oficial: 'AE = SECRETO', fecha_consulta: '2026-11-17' }];
    expect(JSON.stringify(resumirConocimiento(carpeta({ 'fichas.json': f })))).not.toContain('SECRETO');
  });
});
