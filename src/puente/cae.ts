import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ResumenCae {
  /** Falso si no existe la carpeta del agente. */
  disponible: boolean;
  fichas: { total: number; residencial: number; industrial: number; conVersion: number; serieS: number };
  normativa: { total: number; aprobadas: number; enConsulta: number; ultimaPublicacion: string | null };
  alertas: number;
  alertasRecientes: string[];
  oportunidades: { total: number; pendientes: number };
  ultimaConsulta: string | null;
  ultimoInforme: { nombre: string; fecha: string } | null;
  /** Ficheros de la base de conocimiento que no se han podido leer. */
  problemas: string[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFecha = (v: unknown): v is string => typeof v === 'string' && FECHA.test(v);
const objetos = (l: unknown[]) => l.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x));
const maxFecha = (fs: Array<string | null>) => fs.reduce<string | null>((m, f) => (f && (!m || f > m) ? f : m), null);

/**
 * Resumen de la base de conocimiento del agente CAE para el panel de la oficina.
 * Solo lectura y solo recuentos y títulos cortos: no sale contenido de fichas, fórmulas ni informes.
 */
export function resumirConocimiento(carpeta: string): ResumenCae {
  const vacio: ResumenCae = {
    disponible: false, fichas: { total: 0, residencial: 0, industrial: 0, conVersion: 0, serieS: 0 },
    normativa: { total: 0, aprobadas: 0, enConsulta: 0, ultimaPublicacion: null }, alertas: 0, alertasRecientes: [],
    oportunidades: { total: 0, pendientes: 0 }, ultimaConsulta: null, ultimoInforme: null, problemas: [],
  };
  if (!existsSync(carpeta)) return vacio;
  const problemas: string[] = [];
  const leer = (nombre: string): Array<Record<string, unknown>> => {
    const ruta = join(carpeta, 'conocimiento', nombre);
    if (!existsSync(ruta)) return [];
    try {
      const d: unknown = JSON.parse(readFileSync(ruta, 'utf8'));
      if (!Array.isArray(d)) throw new Error('no es una lista');
      return objetos(d);
    } catch { problemas.push(nombre); return []; }
  };
  const fichas = leer('fichas.json'), norma = leer('normativa.json'), alertas = leer('alertas.json'), oport = leer('oportunidades.json');

  const ultimoInforme = (() => {
    const dir = join(carpeta, 'informes');
    if (!existsSync(dir)) return null;
    let mejor: { nombre: string; fecha: string } | null = null;
    for (const n of readdirSync(dir)) {
      const m = /^(\d{4}-\d{2}-\d{2})-.+\.md$/.exec(n);
      if (m && (!mejor || m[1]! > mejor.fecha || (m[1] === mejor.fecha && n > mejor.nombre))) mejor = { nombre: n, fecha: m[1]! };
    }
    return mejor;
  })();

  const recientes = [...alertas]
    .sort((a, b) => String(b.fecha_consulta ?? '').localeCompare(String(a.fecha_consulta ?? '')))
    .slice(0, 3).map((a) => String(a.titulo ?? 'Alerta sin título').slice(0, 140));

  return {
    disponible: true,
    fichas: {
      total: fichas.length,
      residencial: fichas.filter((f) => f.sector === 'residencial').length,
      industrial: fichas.filter((f) => f.sector === 'industrial').length,
      conVersion: fichas.filter((f) => typeof f.version === 'string' && f.version.length > 0).length,
      serieS: fichas.filter((f) => f.programa === 'pobreza_energetica_serie_S').length,
    },
    normativa: {
      total: norma.length,
      aprobadas: norma.filter((n) => n.estado === 'aprobada').length,
      enConsulta: norma.filter((n) => n.estado === 'consulta_publica').length,
      ultimaPublicacion: maxFecha(norma.map((n) => (esFecha(n.fecha_publicacion) ? n.fecha_publicacion : null))),
    },
    alertas: alertas.length,
    alertasRecientes: recientes,
    oportunidades: { total: oport.length, pendientes: oport.filter((o) => o.estado === 'pendiente_revision').length },
    ultimaConsulta: maxFecha([...fichas, ...norma, ...alertas, ...oport].map((x) => (esFecha(x.fecha_consulta) ? x.fecha_consulta : null))),
    ultimoInforme,
    problemas,
  };
}
