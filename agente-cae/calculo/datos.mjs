// Cuestionario de datos para una estimación RES060: qué hay que preguntar, de dónde sale cada dato y cuándo aplica.
// El agente pregunta SOLO lo que falta (siguientesPreguntas) y no calcula hasta tenerlo todo (aEntrada).
// Fuente de los orígenes y reglas: guía interna de INER (pendiente de contrastar con la ficha oficial).
import { etaICaldera } from './res060.mjs';

/** Acepta coma o punto decimal («1,78», «1.78», «1.234,5», «1,234.5»). Devuelve null si no es un número. */
export function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let t = v.trim().replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const es = (r, id, valor) => String(r[id] ?? '').trim().toLowerCase() === valor;
const num = (r, id) => aNumero(r[id]);
const esGasOGasoleo = (r) => es(r, 'combustible', 'gas') || es(r, 'combustible', 'gasoleo');
const sinTabla = (r) => es(r, 'combustible', 'butano_propano') || es(r, 'combustible', 'otro') || (es(r, 'combustible', 'gas') && num(r, 'anioCaldera') !== null && num(r, 'anioCaldera') < 1998);
const daAcs = (r) => es(r, 'calderaDaAcs', 'si');

/** Orden de las preguntas = orden en que se hacen. */
export const PREGUNTAS = [
  { id: 'superficieM2', tipo: 'numero', pregunta: '¿Cuántos m² tiene la vivienda?', donde: 'Certificado de eficiencia energética (CEE) previo, páginas 1-2.' },
  { id: 'zonaClimatica', tipo: 'texto', pregunta: '¿Qué zona climática pone el CEE (por ejemplo D3, E1)?', donde: 'CEE previo, páginas 1-2. Con ella se elige el clima del SCOP.' },
  { id: 'dcalKwhM2', tipo: 'numero', pregunta: '¿Cuál es la demanda de calefacción (kWh/m²·año) de la situación original?', donde: 'CEE previo, Anexo III, situación original (0 % de ahorro). No valen las tablas del borrador RES060FC.' },
  { id: 'combustible', tipo: 'opcion', opciones: ['gas', 'gasoleo', 'butano_propano', 'otro'], pregunta: '¿Qué combustible usaba la caldera anterior (gas, gasóleo, butano/propano u otro)?', donde: 'CEE previo (generador de calefacción), fotos de la placa o factura.' },
  { id: 'anioCaldera', tipo: 'numero', pregunta: '¿De qué año es la caldera anterior?', donde: 'Número de serie, placa de características o manual del fabricante. Hace falta una prueba documental.', aplica: esGasOGasoleo },
  { id: 'condensacion', tipo: 'si_no', pregunta: '¿La caldera anterior era de condensación?', donde: 'Manual o ficha del fabricante. Hace falta una prueba documental.', aplica: (r) => esGasOGasoleo(r) && !(es(r, 'combustible', 'gasoleo') && num(r, 'anioCaldera') !== null && num(r, 'anioCaldera') < 1998) && !(es(r, 'combustible', 'gas') && num(r, 'anioCaldera') !== null && num(r, 'anioCaldera') < 1998) },
  { id: 'encendido', tipo: 'opcion', opciones: ['piloto', 'automatico'], pregunta: '¿La caldera de gas tenía piloto o encendido automático?', donde: 'Manual del fabricante.', aplica: (r) => es(r, 'combustible', 'gas') && !(num(r, 'anioCaldera') !== null && num(r, 'anioCaldera') < 1998) },
  { id: 'etaIDirecto', tipo: 'numero', pregunta: 'La tabla de la guía no cubre esta caldera: ¿qué rendimiento anterior (ηi, entre 0 y 1) se puede documentar y con qué documento?', donde: 'Documento original del fabricante o criterio oficial; si no se puede documentar, dilo y no se estima.', aplica: sinTabla },
  { id: 'calderaDaAcs', tipo: 'si_no', pregunta: '¿La caldera anterior también producía el agua caliente (ACS)?', donde: 'CEE previo (generadores) y fotos de la instalación.' },
  { id: 'litrosDia', tipo: 'numero', pregunta: '¿Cuántos litros/día de ACS pone el CEE previo?', donde: 'CEE previo (demanda de ACS en l/día). Sirve para el control con la fórmula del catálogo.', aplica: daAcs },
  { id: 'epAcsKwhM2', tipo: 'numero', pregunta: '¿Qué energía primaria no renovable de ACS pone el CEE previo (kWh/m²·año)?', donde: 'CEE previo, Anexo II, apartado 2 (energía primaria de ACS, situación previa).', aplica: daAcs },
  { id: 'factorEP', tipo: 'numero', pregunta: '¿Cuál es el factor de paso a energía primaria no renovable del combustible de la caldera (kWhEP/kWh)?', donde: 'Documento reconocido «Factores de emisión de CO₂ y coeficientes de paso a energía primaria» (MITECO-IDAE). En los casos de José, gasóleo-C = 1,179. Para otro combustible hay que leerlo del documento: no se inventa.', aplica: daAcs },
  { id: 'etaCert', tipo: 'numero', pregunta: '¿Qué rendimiento estacional da el certificado a la caldera (por ejemplo 64,8 % ó 0,648)?', donde: 'CEE previo, página 3, generador «Calefacción y ACS» (rendimiento estimado del CE3X). No es el ηi de la tabla B.3.', aplica: daAcs },
  { id: 'unicoGenerador', tipo: 'si_no', pregunta: '¿La caldera era el único generador de calefacción de la vivienda?', donde: 'CEE previo (lista de generadores).' },
  { id: 'cobertura', tipo: 'numero', pregunta: '¿Qué porcentaje pone el CEE en «Demanda cubierta» de esa caldera (por ejemplo 83,41)?', donde: 'CEE previo (CE3X), generador de calefacción, «Demanda cubierta».', aplica: (r) => es(r, 'unicoGenerador', 'no') },
  { id: 'temperaturaImpulsion', tipo: 'opcion', opciones: ['35', '55'], pregunta: '¿Qué emisores tiene la instalación: suelo radiante (35 °C) o radiadores (55 °C)?', donde: 'Confirmación del cliente/instalador. El CEE o las facturas pueden decir otra cosa: manda lo que hay instalado.' },
  { id: 'etaSH', tipo: 'numero', pregunta: '¿Cuál es el ηs,h de la bomba de calor a esa temperatura de impulsión y al clima de la zona (por ejemplo 1,78)?', donde: 'EPREL (UE 811/2013): https://eprel.ec.europa.eu/ (necesito el enlace o el id del producto; no se eluden los bloqueos de la web) o ficha del fabricante.' },
  { id: 'acsTipo', tipo: 'opcion', opciones: ['conjunto', 'deposito_aparte'], pregunta: '¿El depósito/interacumulador es del mismo fabricante que la bomba (conjunto) o va aparte?', donde: 'Factura, fotos de placas y ficha del fabricante. Conjunto = Anexo VI caso 1; aparte = caso 3.', aplica: daAcs },
  { id: 'etaWh', tipo: 'numero', pregunta: '¿Cuál es el ηwh del conjunto (por ejemplo 1,30)?', donde: 'EPREL o ficha del fabricante del conjunto.', aplica: (r) => daAcs(r) && es(r, 'acsTipo', 'conjunto') },
  { id: 'copA7W55', tipo: 'numero', pregunta: '¿Cuál es el COP a A7/W55 de la bomba (por ejemplo 2,98)?', donde: 'Ficha del fabricante. Si el kit no lo publica, el de otro kit con la misma unidad exterior (dilo claramente).', aplica: (r) => daAcs(r) && es(r, 'acsTipo', 'deposito_aparte') },
  { id: 'fcZona', tipo: 'numero', pregunta: '¿Cuál es el factor de la zona climática para el SCOPdhw (en la guía: D3 = 1,113, E1 = 1,056)?', donde: 'Ficha RES060, Anexo VI. Si la zona no está en la guía hay que leerlo del texto oficial; no se inventa.', aplica: (r) => daAcs(r) && es(r, 'acsTipo', 'deposito_aparte') },
  { id: 'retiradaCaldera', tipo: 'si_no', admiteNoSe: true, pregunta: '¿Hay prueba de que se retiró la caldera (factura con desmontaje, fotos)?', donde: 'Factura («desmontaje de la caldera») y fotos. Es requisito (Anexo II).' },
];

const contestada = (p, r) => {
  const v = r[p.id];
  if (v === undefined || v === null || String(v).trim() === '') return false;
  const t = String(v).trim().toLowerCase();
  if (p.tipo === 'numero') return aNumero(v) !== null;
  if (p.tipo === 'si_no') return t === 'si' || t === 'no' || (p.admiteNoSe && t === 'no_se');
  if (p.tipo === 'opcion') return p.opciones.includes(t);
  return true;
};

/** Las próximas `n` preguntas que aplican y siguen sin contestar. */
export function siguientesPreguntas(respuestas, n = 4) {
  return PREGUNTAS.filter((p) => (!p.aplica || p.aplica(respuestas)) && !contestada(p, respuestas)).slice(0, n);
}

/** Solo lo que da la guía: B4 y D3 → cálido, E1 → medio. El resto se consulta en la tabla del Anexo III. */
export function climaDeZona(zona) {
  const z = String(zona ?? '').trim().toUpperCase();
  if (z === 'B4' || z === 'D3') return 'calido';
  if (z === 'E1') return 'medio';
  return null;
}

/** Convierte las respuestas en la entrada de `calcularRES060`. Si falta algo, lanza un error con lo que falta. */
export function aEntrada(r) {
  const faltan = siguientesPreguntas(r, PREGUNTAS.length);
  if (faltan.length) throw new Error(`Faltan datos: ${faltan.map((p) => p.id).join(', ')}.`);
  const t = (id) => String(r[id]).trim().toLowerCase();
  const pendientes = [];

  let etaI;
  if (sinTabla(r)) { etaI = aNumero(r.etaIDirecto); if (etaI > 1) etaI /= 100; }
  else etaI = etaICaldera({ combustible: t('combustible'), anio: num(r, 'anioCaldera'), condensacion: r.condensacion === undefined ? undefined : t('condensacion') === 'si', encendido: r.encendido === undefined ? undefined : t('encendido') });

  let acs = null;
  if (daAcs(r)) {
    acs = t('acsTipo') === 'conjunto'
      ? { litrosDia: num(r, 'litrosDia'), tipo: 'conjunto', etaWh: num(r, 'etaWh') }
      : { litrosDia: num(r, 'litrosDia'), tipo: 'deposito_aparte', copA7W55: num(r, 'copA7W55'), fcZona: num(r, 'fcZona') };
    let etaCert = num(r, 'etaCert');
    if (etaCert > 1) etaCert /= 100;
    acs.derivado = { epAcsKwhM2: num(r, 'epAcsKwhM2'), factorEP: num(r, 'factorEP'), etaCert };
  }
  const cobertura = es(r, 'unicoGenerador', 'si') ? 1 : num(r, 'cobertura') / 100;

  const clima = climaDeZona(r.zonaClimatica);
  if (!clima) pendientes.push(`Zona ${String(r.zonaClimatica).trim()}: consultar la tabla de equivalencia de clima del Anexo III de RES060 para elegir el clima del ηs,h.`);
  if (!es(r, 'retiradaCaldera', 'si')) pendientes.push('Falta la prueba de la retirada de la caldera (es requisito): factura con desmontaje o fotos.');

  return {
    entrada: { superficieM2: num(r, 'superficieM2'), dcalKwhM2: num(r, 'dcalKwhM2'), etaI, etaSH: num(r, 'etaSH'), cobertura, acs, pendientes },
    clima, temperaturaImpulsion: Number(t('temperaturaImpulsion')), pendientes,
  };
}
