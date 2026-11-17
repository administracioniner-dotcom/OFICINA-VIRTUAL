#!/usr/bin/env node
// Valida la base de conocimiento del agente CAE (agente-cae/conocimiento/*.json).
// Uso: node agente-cae/validar.mjs   (devuelve código 1 si hay errores). Sin dependencias.
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIABILIDAD = ['verificado', 'referencia_publica', 'estimacion', 'no_confirmado'];
const CLASIFICACION = ['hecho', 'interpretacion', 'hipotesis', 'estimacion'];
const TIPO_FUENTE = ['oficial', 'comercial', 'otra'];
const texto = (v) => typeof v === 'string' && v.trim().length > 0;
const fechaValida = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Reglas propias de cada fichero: devuelven una lista de problemas de un registro. */
const ESPECIFICAS = {
  'normativa.json': (r, hoy, p) => {
    if (!texto(r.titulo)) p.push('falta titulo');
    if (!['aprobada', 'borrador', 'propuesta', 'consulta_publica', 'derogada'].includes(r.estado)) p.push('estado no válido (aprobada, borrador, propuesta, consulta_publica o derogada)');
    if (r.estado === 'aprobada' && !fechaValida(r.fecha_publicacion)) p.push('fecha_publicacion obligatoria (AAAA-MM-DD) en normativa aprobada');
    if (r.fecha_publicacion != null && !fechaValida(r.fecha_publicacion)) p.push('fecha_publicacion con formato AAAA-MM-DD');
    if (r.entrada_en_vigor != null && !fechaValida(r.entrada_en_vigor)) p.push('entrada_en_vigor con formato AAAA-MM-DD o null');
    if (!Array.isArray(r.afecta_a) || !r.afecta_a.every(texto)) p.push('afecta_a debe ser una lista de textos');
    if (!texto(r.impacto_iner)) p.push('falta impacto_iner');
    if (!texto(r.oportunidades_riesgos)) p.push('falta oportunidades_riesgos');
  },
  'fichas.json': (r, hoy, p) => {
    if (!texto(r.codigo)) p.push('falta codigo');
    if (!texto(r.denominacion)) p.push('falta denominacion');
    if (!['residencial', 'industrial'].includes(r.sector)) p.push('sector debe ser residencial o industrial (el terciario está fuera de alcance)');
    if (r.version !== null && !texto(r.version)) p.push('version debe ser texto o null (null = no publicada)');
    if (r.fecha_ficha !== null && !fechaValida(r.fecha_ficha)) p.push('fecha_ficha con formato AAAA-MM-DD o null (null = no publicada)');
    if (r.formula_oficial !== null && typeof r.formula_oficial !== 'string') p.push('formula_oficial debe ser el texto de la ficha o null');
    else if (typeof r.formula_oficial === 'string' && r.fuente?.tipo !== 'oficial') p.push('formula_oficial solo se admite copiada de una fuente oficial');
  },
  'precios.json': (r, hoy, p) => {
    if (!texto(r.empresa)) p.push('falta empresa');
    if (!texto(r.tipo_empresa)) p.push('falta tipo_empresa');
    if (!texto(r.actuacion)) p.push('falta actuacion');
    if (typeof r.precio !== 'number' || !Number.isFinite(r.precio) || r.precio < 0) p.push('precio debe ser un número');
    if (!['€/CAE', '€/MWh'].includes(r.unidad)) p.push('unidad debe ser €/CAE o €/MWh');
    if (typeof r.condiciones !== 'string') p.push('condiciones debe ser texto (puede ir vacío)');
  },
  'oportunidades.json': (r, hoy, p) => {
    for (const c of ['descripcion', 'potencial_comercial', 'dificultad', 'recursos', 'recomendacion']) if (!texto(r[c])) p.push(`falta ${c}`);
    if (!['pendiente_revision', 'revisada', 'descartada'].includes(r.estado)) p.push('estado debe ser pendiente_revision, revisada o descartada');
  },
  'empresas.json': (r, hoy, p) => {
    if (!texto(r.nombre)) p.push('falta nombre');
    if (!['sujeto_delegado', 'sujeto_obligado', 'intermediario', 'verificador', 'instalador', 'otro'].includes(r.rol)) p.push('rol no válido');
    if (typeof r.rol_comprobado !== 'boolean') p.push('rol_comprobado debe ser true o false (no afirmes un rol sin comprobarlo)');
  },
  'alertas.json': (r, hoy, p) => { if (!texto(r.titulo)) p.push('falta titulo'); },
  'res060.json': () => {}, 'factores.json': () => {}, 'verificadores.json': () => {},
};
export const FICHEROS = Object.keys(ESPECIFICAS);
const CLAVE_UNICA = { 'fichas.json': 'codigo' };

/** Problemas de un fichero de la base de conocimiento, ya con el nombre del fichero delante. */
export function validarArchivo(nombre, datos, hoy) {
  const regla = ESPECIFICAS[nombre];
  if (!regla) return [`${nombre}: fichero desconocido (los válidos son ${FICHEROS.join(', ')})`];
  if (!Array.isArray(datos)) return [`${nombre}: debe ser una lista`];
  const errores = [];
  const ids = new Set(), claves = new Set();
  datos.forEach((r, i) => {
    const etiqueta = `${nombre} #${i + 1}${r && texto(r.id) ? ` (${r.id})` : ''}`;
    if (!r || typeof r !== 'object' || Array.isArray(r)) { errores.push(`${etiqueta}: debe ser un objeto`); return; }
    const p = [];
    if (!texto(r.id)) p.push('falta id');
    else if (ids.has(r.id)) p.push('id repetido');
    else ids.add(r.id);
    if (!fechaValida(r.fecha_consulta)) p.push('fecha_consulta obligatoria con formato AAAA-MM-DD');
    else if (r.fecha_consulta > hoy) p.push('fecha_consulta es futura');
    const f = r.fuente;
    if (!f || typeof f !== 'object') p.push('falta fuente');
    else {
      if (!texto(f.nombre)) p.push('fuente sin nombre');
      if (typeof f.url !== 'string' || !/^https?:\/\/\S+$/.test(f.url)) p.push('fuente sin enlace http(s)');
      if (!TIPO_FUENTE.includes(f.tipo)) p.push(`fuente.tipo debe ser ${TIPO_FUENTE.join(', ')}`);
    }
    if (!FIABILIDAD.includes(r.fiabilidad)) p.push(`fiabilidad debe ser ${FIABILIDAD.join(', ')}`);
    if (!CLASIFICACION.includes(r.clasificacion)) p.push(`clasificacion debe ser ${CLASIFICACION.join(', ')}`);
    regla(r, hoy, p);
    const k = CLAVE_UNICA[nombre];
    if (k && texto(r[k])) { if (claves.has(r[k])) p.push(`${k} repetido`); else claves.add(r[k]); }
    p.forEach((m) => errores.push(`${etiqueta}: ${m}`));
  });
  return errores;
}

/** Valida todos los .json de una carpeta. */
export function validarCarpeta(carpeta, hoy) {
  const errores = [];
  for (const nombre of readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort()) {
    let datos;
    try { datos = JSON.parse(readFileSync(join(carpeta, nombre), 'utf8')); } catch { errores.push(`${nombre}: no es JSON válido`); continue; }
    errores.push(...validarArchivo(nombre, datos, hoy));
  }
  return errores;
}

const esPrincipal = () => { try { return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (esPrincipal()) {
  const carpeta = join(dirname(fileURLToPath(import.meta.url)), 'conocimiento');
  const errores = validarCarpeta(carpeta, new Date().toISOString().slice(0, 10));
  if (errores.length) { console.error(errores.join('\n')); console.error(`\n${errores.length} problema(s).`); process.exit(1); }
  console.log('Base de conocimiento correcta.');
}
