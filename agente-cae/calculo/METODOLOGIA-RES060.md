# Metodología RES060 (sustitución de caldera por aerotermia)

> Fuente: guía interna de INER (ficha RES060 V1.1). **Pendiente de contrastar con el texto de la ficha oficial** (el agente lo hará en la fase 2 al acceder a MITECO/BOE). Hasta entonces es una **estimación comercial**, no un cálculo técnicamente justificable. El calculador es `res060.mjs`; las pruebas, `res060.test.mjs`.

## Fórmula
`AE = FP · [ (Dcal·S)·(1/ηi − 1/SCOP) + Dacs·(1/ηi − 1/SCOPdhw) ] · f`

- FP = 1; **1 CAE = 1 kWh/año** (se redondea al entero). CC = 2,5. F(1) = 3 %. F(2) = 0.
- **SCOP = CC·(ηs,h + F1)** = 2,5·(ηs,h + 0,03).
- **SCOPdhw:** bomba y depósito del mismo fabricante (Anexo VI, caso 1) → 2,5·ηwh; depósito aparte (Anexo VI, caso 3) → COP(A7/W55) × factor de la zona.
- **Dacs = litros/día · 19,50998** (método elegido por José, 17/11/2026: es el que usa el verificador según la guía; con él se reproduce el caso 3 validado, 43.780 CAE con clima medio) (= 0,001162 · 46 · 365). Sin ACS en la caldera se omite ese término.
- **f:** 100 % si la caldera era el único generador; si no, la «demanda cubierta» del CE3X.
- Fuera de alcance: efecto multiplicador, Ceuta, Melilla y Canarias.

## De dónde sale cada dato
| Dato | Origen |
|---|---|
| Superficie S y zona climática | CEE previo |
| Dcal (kWh/m²·año) | CEE previo, situación original |
| Litros de ACS | CEE previo |
| ηi | tabla B.3 de RES210/TER210 (`etaICaldera`); año y tipo de la caldera, con prueba documental |
| ηs,h, ηwh | EPREL o ficha del fabricante, a la temperatura de impulsión y clima que correspondan |
| COP A7/W55 | ficha del fabricante |
| Emisores y temperatura de impulsión | confirmación del cliente (el CEE puede decir otra cosa) |

## Reglas
- Un solo cálculo; las dudas se dicen aparte, no se esconden en el resultado.
- Si un dato no se puede documentar, se dice; **no se inventa** (el calculador devuelve `null` o da error en vez de suponer).
- Cada resultado enseña datos de entrada, hipótesis, fórmula, resultado, pendientes por confirmar, documentación necesaria y riesgos de reducción.
- No mezclar el borrador RES060FC con la V1.1.
- Si el ahorro sale negativo, el resultado lo avisa como no presentable.

## Cuestionario guiado
`datos.mjs` define las preguntas que hay que hacer (con el origen de cada dato y cuándo aplican) y `res060-cli.mjs` las usa: pregunta solo lo que falta y calcula cuando está todo. Los números se aceptan con coma o punto.
Zonas con clima conocido por la guía: B4 y D3 → cálido, E1 → medio; para otras hay que consultar la tabla del Anexo III. Factores de zona del SCOPdhw conocidos: D3 = 1,113, E1 = 1,056; para otros, leer la ficha.

## Excel de la estimación
`generar_excel.py` crea el Excel de 4 hojas con fórmulas vivas a partir de un JSON de caso (ver `ejemplos/caso-ficticio.json`). Se comprueba con LibreOffice (recalcula y compara con el calculador). Los casos reales van en `agente-cae/casos/` (git lo ignora). Necesita Python 3 con `openpyxl`; para recalcular, LibreOffice.
Con los datos del caso 3 de José (clima cálido, método de Dacs del catálogo) sale 46.378 CAE; su Excel, que deriva Dacs del CEE, da 46.399 (21 de diferencia por ese único dato).
