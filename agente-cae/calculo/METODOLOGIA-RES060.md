# Metodología RES060 (sustitución de caldera por aerotermia)

> Fuente: guía interna de INER **contrastada el 17/11/2026 con los textos oficiales de MITECO** (ficha RES060 V1.1 y sus anexos II a VI, y Anexo II de RES210). Es una **estimación comercial**, no un cálculo técnicamente justificable, hasta que cada dato de un caso se contraste con su documento. El calculador es `res060.mjs`; las pruebas, `res060.test.mjs`.

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
- **SCOP con todas las cifras significativas, sin recorte** (criterio 24/11.01: error de redondeo máximo 1 %). El calculador informa aparte de cuánto bajaría si el verificador lo recortara a 2 decimales (caso 1 de José: 12.217 → 12.213).
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
Comprobado con los Excel de José (clima y datos de cada caso): Caso 2 → 8.931 (igual que el validado), Caso 3 (clima cálido) → 46.399 (igual que su Excel), Caso 1 → 12.217 (el validado, 12.213, recorta el SCOP). Caso 3 con clima medio y Dacs de catálogo → 43.780, el validado.
Cada paso del Excel indica su base (columna «Base», hoja Referencias) y lleva la sustitución numérica; hay dos controles (límite físico y contraste del Dacs con el catálogo).

## Contraste con el texto oficial (MITECO, 17/11/2026)
Coincide con la ficha: la fórmula, FP = 1, CC = 2,5, F(1) = 3 % y F(2) = 0, SCOP = CC·(ηs,h + F(1) + F(2)), SCOPdhw conjunto = CC·ηhw, SCOPdhw depósito aparte = COP A7/W55 × FC, la tabla de climas (A3–D3 cálido, E1 medio), la tabla completa de FC por zona y la tabla B.3 de rendimientos de caldera (el calculador ya incluye gas anterior a 1998 y combustibles sólidos).
- **DACS:** la ficha dice «según el certificado de eficiencia energética antes de la actuación» (kWh/año). Respalda el método derivado del CEE.
- **ηi:** la ficha pone 0,92 por defecto (sobre PCS) o «el valor de la última inspección»; la tabla B.3 es la que da el Anexo II de RES210 en ausencia de datos del rendimiento estacional. Que el verificador use la tabla B.3 viene del criterio 24/11.03 que cita José (no está en la ficha).
- **Clima del SCOP:** «al menos» el de clima medio, o el de la zona equivalente (Anexo III). Con clima medio el resultado es menor y siempre admisible; en D3 con clima cálido sube.
- **Recorte del SCOP a 2 decimales:** no aparece en la ficha; es una práctica vista en el Caso 1 (12.213). Por eso se calcula sin recortar y se informa de la diferencia.
- **Retirada de la caldera:** retirada física y de su depósito en el punto limpio, **o condena física** del equipo (Anexo II de la ficha).
- **Caldera que se mantiene de respaldo** (D1, D2, D3, E1): la bomba debe superar el 35 % de la carga de diseño y el ahorro se calcula sobre el % de demanda que cubre la bomba.
- **Resolución de 4-11-2026 (BOE-A-2026-23657, publicada el 11-11-2026):** suprime del ámbito de RES060 el requisito de que «la actuación no afecta a los elementos terminales», sin cambiar el cálculo ni la documentación. El PDF de la ficha en la web (V1.1) aún lleva el texto antiguo.
