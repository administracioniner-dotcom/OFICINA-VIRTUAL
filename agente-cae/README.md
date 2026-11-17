# Agente CAE: cómo ponerlo en marcha (Windows)

1. Instala Claude Code en tu PC y entra con tu cuenta (una vez). Instala Node.js (ya lo tienes para la oficina).
2. **Probar a mano:** doble clic en `ejecutar-semanal.bat`. Tarda unos minutos; al terminar mira `informes/` (el informe semanal) y `informes/ultima-ejecucion.log`.
3. **Programar:** doble clic en `programar-tarea.bat` → crea la tarea «INER Agente CAE semanal» (miércoles 23:00; si el PC está apagado, se ejecuta al encenderlo).
4. **Verlo en la oficina (opcional):** ver la sección «Conectar con la oficina virtual» más abajo. Si la oficina no está abierta, no pasa nada: solo no verás la actividad.
5. Comprobar la base de conocimiento: `node validar.mjs`.

## Permisos y límites
Solo puede buscar/leer en la web, leer y escribir en esta carpeta y ejecutar `node validar.mjs`. Cualquier otra cosa se deniega. Tope de gasto de 5 USD por ejecución (se cambia en `ejecutar-semanal.bat`). No envía correos ni contacta con nadie.

## Sin probar todavía
Todo esto está preparado pero **no probado en Windows real ni con Claude Code real**: desde la sesión de desarrollo no hay acceso a MITECO ni al BOE. La primera ejecución a mano (paso 2) es la prueba; si falla, mira el `.log`.

## Excel de una estimación RES060
Necesita Python 3 con `openpyxl` (`pip install openpyxl`). Con un fichero de caso en `casos/` (ver `calculo/ejemplos/caso-ficticio.json`):
`python3 calculo/generar_excel.py casos/mi-caso.json casos/mi-caso.xlsx`
La carpeta `casos/` no se sube a GitHub. Sin probar en Windows.

## Conectar con la oficina virtual
1. Abre la oficina con `iniciar.bat` (la de la carpeta principal) y déjala abierta.
2. Haz clic en el agente del departamento **CAE** → **Editar** → ponle de nombre **Agente CAE** y marca **«Real: lo mueve un Claude Code mío»** → Guardar.
3. En `agente-cae`, doble clic en **`conectar-oficina.bat`**. Te pregunta el nombre del agente (Intro = «Agente CAE»): escribe **exactamente el mismo** que le pusiste en la oficina. Crea `.claude\settings.json` con los hooks (usa la ruta de tu carpeta, por eso no se sube a GitHub). Si cambias el nombre del agente en la oficina, vuelve a ejecutarlo.
4. Lanza `ejecutar-semanal.bat` (o espera al miércoles 23:00 con la oficina abierta). Verás al agente trabajar y, en su ficha, las tareas, la actividad y **«Base de conocimiento CAE»** (fichas, normativa, alertas, oportunidades, último informe; se actualiza cada 30 s).

Qué se envía a la oficina: estado, herramienta usada (primera palabra de comandos o nombre de fichero; de las páginas web solo «Consulta la web»), la orden recortada a 80 caracteres y solo a este ordenador. El panel lee solo recuentos y títulos cortos de `conocimiento/` e `informes/`, nunca fórmulas ni contenido de fichas.
Si la oficina está cerrada, los avisos se pierden sin molestar al agente; el informe y los datos se guardan igual.

## Hablar con el agente (preguntas y cálculos)
Doble clic en **`hablar-con-el-agente.bat`** (abre Claude Code dentro de esta carpeta; la primera vez di que **sí confías en la carpeta**). Escribe, por ejemplo:
- «Quiero una estimación RES060»: te hace las preguntas que faltan (con el origen de cada dato) y calcula.
- «Revisa este cálculo: casos\\mi-caso.xlsx»: comprueba el cálculo contra los documentos y la ficha.
- «Genera el Excel de este caso»: crea el Excel de 4 hojas en `casos\` (necesita Python con `openpyxl`: `winget install Python.Python.3.12` y luego `pip install openpyxl`).
- Cualquier pregunta sobre fichas y normativa: contesta con lo registrado en `conocimiento\` y, si hace falta, busca en MITECO y el BOE.
Al terminar, escribe `/exit`. Si la oficina está abierta y conectada, verás al agente trabajar.
