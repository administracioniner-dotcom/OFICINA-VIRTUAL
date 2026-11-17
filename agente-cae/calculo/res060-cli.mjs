#!/usr/bin/env node
// Uso: node calculo/res060-cli.mjs respuestas.json
// Si faltan datos, escribe las próximas preguntas (y de dónde se consigue cada dato); si no, calcula y enseña el resultado.
import { readFileSync } from 'node:fs';
import { aEntrada, siguientesPreguntas } from './datos.mjs';
import { calcularRES060 } from './res060.mjs';

const ruta = process.argv[2];
if (!ruta) { console.error('Uso: node calculo/res060-cli.mjs respuestas.json'); process.exit(2); }
let r;
try { r = JSON.parse(readFileSync(ruta, 'utf8')); } catch { console.error('No se pudo leer el JSON de respuestas.'); process.exit(2); }

const faltan = siguientesPreguntas(r, 4);
if (faltan.length) {
  console.log('FALTAN DATOS. Pregunta a José (máximo estas):');
  faltan.forEach((p, i) => console.log(`${i + 1}. [${p.id}] ${p.pregunta}\n   Dónde se consigue: ${p.donde}`));
  process.exit(0);
}
const { entrada, clima, temperaturaImpulsion, pendientes } = aEntrada(r);
const c = calcularRES060(entrada);
const f = (n, d = 2) => n.toLocaleString('es-ES', { maximumFractionDigits: d });
console.log(`${c.tipoResultado}\n`);
console.log(`AE = ${f(c.ae, 0)} CAE   (sin redondear: ${f(c.aeSinRedondear)})`);
console.log(`Fórmula: ${c.formula}`);
console.log(`Datos: S = ${f(entrada.superficieM2)} m², Dcal = ${f(entrada.dcalKwhM2)}, ηi = ${f(entrada.etaI)}, ηs,h = ${f(entrada.etaSH)} (clima ${clima ?? '¿?'}, impulsión ${temperaturaImpulsion} °C), f = ${f(entrada.cobertura, 4)}`);
console.log(`SCOP = ${f(c.scop, 3)}${c.scopdhw ? `, SCOPdhw = ${f(c.scopdhw, 3)}, Dacs = ${f(c.dacs)}` : ' (sin ACS)'}`);
console.log(`Términos: calefacción ${f(c.terminos.calefaccion)} + ACS ${f(c.terminos.acs)}`);
console.log('\nHipótesis:'); c.hipotesis.forEach((h) => console.log(`- ${h}`));
console.log('\nPendiente de confirmar:'); (c.pendientes.length ? c.pendientes : ['(nada)']).forEach((h) => console.log(`- ${h}`));
console.log('\nDocumentación necesaria:'); c.documentacion.forEach((h) => console.log(`- ${h}`));
console.log('\nPosibles causas de reducción en la verificación:'); c.riesgosReduccion.forEach((h) => console.log(`- ${h}`));
