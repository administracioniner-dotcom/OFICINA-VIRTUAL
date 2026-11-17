// Calculador de CAE para RES060 (sustitución de caldera por aerotermia). Sin dependencias.
// Fórmula, constantes y tablas: guía interna del agente CAE (ficha RES060 V1.1). PENDIENTE de contrastar con el texto de la ficha oficial.
// Es una ESTIMACIÓN: cada dato de entrada debe justificarse con su documento original antes de presentarla.

export const CONSTANTES = {
  FP: 1,
  CC: 2.5,
  F1: 0.03,
  F2: 0,
  ce: 0.001162,
  deltaT: 60 - 14,
  get dacsPorLitroDia() { return this.ce * this.deltaT * 365; },
};

/** Factor FC por zona climática del CTE para SCOPdhw = COP A7/W55 × FC (ficha RES060 V1.1, Anexo VI, caso 3; leído en MITECO el 17/11/2026). */
export const FC_ZONA = { A3: 1.246, A4: 1.251, B3: 1.223, B4: 1.228, C1: 1.154, C2: 1.165, C3: 1.175, C4: 1.181, D1: 1.093, D2: 1.103, D3: 1.113, E1: 1.056 };

/** Demanda de ACS (kWh/año) según la fórmula del catálogo, para los litros/día del CEE. */
export const dacs = (litrosDia) => litrosDia * CONSTANTES.dacsPorLitroDia;

/** SCOP = CC·(ηs,h + F1) */
export const scopCalefaccion = (etaSH) => CONSTANTES.CC * (etaSH + CONSTANTES.F1);

/**
 * SCOPdhw. «conjunto»: bomba y depósito del mismo fabricante (Anexo VI, caso 1) → CC·ηwh.
 * «deposito_aparte» (Anexo VI, caso 3) → COP(A7/W55) × factor de la zona (el factor lo da la ficha; aquí no se inventa).
 */
export function scopAcs(a) {
  if (a?.tipo === 'conjunto') {
    requerirPositivo('etaWh', a.etaWh);
    return CONSTANTES.CC * a.etaWh;
  }
  if (a?.tipo === 'deposito_aparte') {
    requerirPositivo('copA7W55', a.copA7W55);
    if (!(typeof a.fcZona === 'number' && a.fcZona > 0)) throw new Error('Falta fcZona: el factor de la zona climática de la ficha (no se inventa).');
    return a.copA7W55 * a.fcZona;
  }
  throw new Error('acs.tipo debe ser «conjunto» o «deposito_aparte».');
}

/**
 * Rendimiento de la caldera anterior (ηi) con la tabla B.3 del Anexo II de RES210/TER210 (leída en MITECO el 17/11/2026; criterio 24/11.03 según la guía de José).
 * Devuelve null cuando la tabla no da valor: entonces hay que documentarlo aparte, no suponerlo.
 */
export function etaICaldera({ combustible, anio, condensacion, encendido, tipo, alimentacion, espacio } = {}) {
  if (combustible === 'solido') {
    const manual = alimentacion === 'manual', auto = alimentacion === 'automatica';
    if (!(manual || auto) || !['sin_calefactar', 'calefactado'].includes(espacio)) return null;
    const calef = espacio === 'calefactado';
    return manual ? (calef ? 0.6 : 0.55) : (calef ? 0.65 : 0.6);
  }
  if (typeof anio !== 'number') return null;
  if (combustible === 'gasoleo') {
    if (anio < 1985) return 0.65;
    if (anio <= 1997) return 0.7;
    if (typeof condensacion !== 'boolean') return null;
    return condensacion ? 0.83 : 0.79;
  }
  if (combustible === 'gas') {
    if (anio < 1998) {
      switch (tipo) {
        case 'pie': return anio < 1979 ? 0.55 : 0.65;
        case 'mural': return 0.65;
        case 'forzado_alta': return 0.68;
        case 'forzado_baja': return 0.72;
        case 'condensacion': return 0.85;
        default: return null;
      }
    }
    if (typeof condensacion !== 'boolean' || !['piloto', 'automatico'].includes(encendido)) return null;
    if (!condensacion) return encendido === 'piloto' ? 0.69 : 0.73;
    return encendido === 'piloto' ? 0.79 : 0.83;
  }
  return null;
}

function requerirPositivo(nombre, v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new Error(`${nombre} debe ser un número mayor que 0.`);
}

const DOCUMENTACION = [
  'Ficha cumplimentada y firmada por el representante legal del solicitante de la emisión de CAE.',
  'Declaración responsable del propietario inicial del ahorro sobre ayudas públicas (modelo del Anexo I de la ficha).',
  'Facturas justificativas con descripción detallada de los elementos principales (de cuya ficha técnica se toman datos).',
  'Informe fotográfico de la instalación térmica antes y después de la actuación.',
  'Certificado de la instalación de la empresa instaladora con los valores de las variables de la fórmula.',
  'Comunicación de puesta en funcionamiento de la instalación térmica en el registro de la comunidad autónoma (hasta 70 kW, vale el acta de puesta en servicio si se cumple lo que indica la ficha).',
  'Certificado de eficiencia energética final con justificante de registro (o el del estado previo con la actuación como mejora).',
  'Prueba del año y del tipo de la caldera (condensación, encendido) que respalde ηi.',
  'Prueba de la retirada física de la caldera y su depósito (punto limpio) o de su condena física.',
  'EPREL o ficha técnica del fabricante: ηs,h a la temperatura de impulsión y clima que correspondan; ηwh si es conjunto; COP A7/W55 si el depósito va aparte.',
  'Confirmación de emisores y temperatura de impulsión (el CEE puede decir otra cosa que la instalación).',
];
const RIESGOS = [
  'ηi sin prueba del año o del tipo de la caldera, o sin valor de última inspección.',
  'Ni retirada física ni condena física de la caldera probadas (Anexo II de la ficha).',
  'Caldera que se mantiene de respaldo en zonas D1, D2, D3 o E1 sin cumplir que la bomba supere el 35 % de la carga de diseño; en ese caso el ahorro solo cuenta sobre el porcentaje cubierto por la bomba.',
  'Marca o tipo del depósito sin confirmar (cambia entre Anexo VI caso 1 y caso 3).',
  'Clima del SCOP: el de la zona (Anexo III) o, como mínimo, el de clima medio; un clima distinto del que el verificador acepta.',
  'Dacs distinta de la que acepte el verificador (la ficha dice «según el certificado de eficiencia energética antes de la actuación»).',
  'Cobertura (f) mal aplicada: debe ser la «demanda cubierta» del CE3X si la caldera no era el único generador.',
  'Datos incoherentes entre CEE, facturas y fotos (por ejemplo, emisores).',
];

/**
 * Entrada: { superficieM2, dcalKwhM2, etaI, etaSH, cobertura = 1, acs: null | {litrosDia, tipo, etaWh | copA7W55+fcZona}, pendientes?: string[] }
 * Devuelve el cálculo con datos, fórmula, hipótesis, pendientes, documentación y riesgos de reducción.
 */
export function calcularRES060(e) {
  requerirPositivo('superficieM2', e?.superficieM2);
  requerirPositivo('dcalKwhM2', e.dcalKwhM2);
  requerirPositivo('etaSH', e.etaSH);
  if (typeof e.etaI !== 'number' || !(e.etaI > 0 && e.etaI <= 1)) throw new Error('etaI debe ser un número entre 0 (sin incluir) y 1.');
  let cobertura = e.cobertura ?? 1;
  if (e.superficieCubiertaM2 !== undefined) {
    requerirPositivo('superficieCubiertaM2', e.superficieCubiertaM2);
    if (e.superficieCubiertaM2 > e.superficieM2) throw new Error('superficieCubiertaM2 no puede ser mayor que la superficie total.');
    cobertura = e.superficieCubiertaM2 / e.superficieM2;
  }
  if (typeof cobertura !== 'number' || !(cobertura > 0 && cobertura <= 1)) throw new Error('cobertura debe ser un número entre 0 (sin incluir) y 1.');

  const scop = scopCalefaccion(e.etaSH);
  const hipotesis = [
    'Fórmula y constantes de la ficha RES060 V1.1 según la guía interna; pendiente de contrastar con el texto oficial.',
    `FP = ${CONSTANTES.FP} (1 CAE = 1 kWh/año), CC = ${CONSTANTES.CC}, F(1) = ${CONSTANTES.F1}, F(2) = ${CONSTANTES.F2}.`,
    'SCOP y resto de magnitudes con todas las cifras significativas, sin recortes intermedios (criterio 24/11.01, error de redondeo máximo 1 %).',
  ];
  const controles = [];
  const terminoCalefaccion = e.superficieM2 * e.dcalKwhM2 * (1 / e.etaI - 1 / scop);

  let terminoAcs = 0, scopdhw = null, dacsKwh = null, dacsMetodo = null;
  if (e.acs) {
    scopdhw = scopAcs(e.acs);
    const der = e.acs.derivado;
    if (der) {
      requerirPositivo('acs.derivado.epAcsKwhM2', der.epAcsKwhM2);
      requerirPositivo('acs.derivado.factorEP', der.factorEP);
      if (typeof der.etaCert !== 'number' || !(der.etaCert > 0 && der.etaCert <= 1)) throw new Error('acs.derivado.etaCert debe ser un número entre 0 (sin incluir) y 1.');
      dacsKwh = der.epAcsKwhM2 / der.factorEP * der.etaCert * e.superficieM2;
      dacsMetodo = 'derivado_cee';
      hipotesis.push('Dacs derivado del CEE previo: EP_ACS ÷ f_EP × ηcert × S (consumo final de ACS por el rendimiento del certificado).');
      if (e.acs.litrosDia !== undefined) {
        requerirPositivo('acs.litrosDia', e.acs.litrosDia);
        const catalogoKwh = dacs(e.acs.litrosDia);
        const diferenciaPct = (catalogoKwh - dacsKwh) / dacsKwh * 100;
        controles.push({ id: 'dacs_catalogo', catalogoKwh, derivadoKwh: dacsKwh, diferenciaPct, ok: Math.abs(diferenciaPct) <= 3,
          texto: `Contraste con la fórmula del catálogo (${e.acs.litrosDia} l/día): ${catalogoKwh.toFixed(1)} kWh/año, diferencia ${diferenciaPct.toFixed(2)} %${Math.abs(diferenciaPct) <= 3 ? '' : ' (revisar)'}.` });
      }
    } else {
      if (e.acs.litrosDia === undefined) throw new Error('Falta acs.litrosDia (método de catálogo) o acs.derivado (datos del CEE).');
      requerirPositivo('acs.litrosDia', e.acs.litrosDia);
      dacsKwh = dacs(e.acs.litrosDia);
      dacsMetodo = 'catalogo';
      hipotesis.push('Dacs por la fórmula del catálogo: litros/día × Ce × ΔT × 365.');
    }
    terminoAcs = dacsKwh * (1 / e.etaI - 1 / scopdhw);
  } else {
    hipotesis.push('Caldera sin ACS: se omite el término de Dacs.');
  }
  if (cobertura < 1) hipotesis.push(`Cobertura f = ${cobertura}: la caldera no era el único generador (dato a tomar de la «demanda cubierta» del CE3X).`);

  const aeSinRedondear = CONSTANTES.FP * (terminoCalefaccion + terminoAcs) * cobertura;
  const pendientes = [...(e.pendientes ?? [])];
  if (aeSinRedondear < 0) pendientes.push('Ahorro negativo: revisar los datos (ηi, ηs,h, Dcal); no es un resultado presentable.');

  // Control de límite físico (criterio 25-07.03): el ahorro no puede superar el consumo que se evita.
  const consumoPrevio = (e.superficieM2 * e.dcalKwhM2 + (dacsKwh ?? 0)) * cobertura / e.etaI;
  controles.unshift({ id: 'ahorro_vs_consumo', valorPct: aeSinRedondear / consumoPrevio * 100, ok: aeSinRedondear < consumoPrevio,
    texto: `El ahorro es el ${(aeSinRedondear / consumoPrevio * 100).toFixed(1)} % del consumo previo de la caldera${aeSinRedondear < consumoPrevio ? '' : ' (revisar: supera el consumo)'}.` });

  // Solo informativo: qué pasaría si el verificador recortara el SCOP a 2 decimales.
  const scopRecortado = Math.floor(scop * 100 + 1e-9) / 100;
  const aeRecortado = Math.round(CONSTANTES.FP * (e.superficieM2 * e.dcalKwhM2 * (1 / e.etaI - 1 / scopRecortado) + terminoAcs) * cobertura);

  return {
    tipoResultado: 'Estimación comercial: no es un cálculo técnicamente justificable hasta contrastar cada dato con su documento.',
    ae: Math.round(aeSinRedondear),
    aeSinRedondear,
    formula: 'AE = FP · [ (Dcal·S)·(1/ηi − 1/SCOP) + Dacs·(1/ηi − 1/SCOPdhw) ] · f',
    datos: { superficieM2: e.superficieM2, dcalKwhM2: e.dcalKwhM2, etaI: e.etaI, etaSH: e.etaSH, cobertura, acs: e.acs ?? null },
    scop, scopdhw, dacs: dacsKwh,
    terminos: { calefaccion: terminoCalefaccion, acs: terminoAcs },
    dacsMetodo, controles, sensibilidadRecorteScop: { scopRecortado, ae: aeRecortado, diferencia: aeRecortado - Math.round(aeSinRedondear) },
    hipotesis, pendientes,
    documentacion: DOCUMENTACION,
    riesgosReduccion: RIESGOS,
  };
}
