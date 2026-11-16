# Conectar un Claude Code real a la oficina

Un agente **real** es un Claude Code tuyo (en tu ordenador) que aparece en la oficina y se mueve según lo que hace: piensa, trabaja, espera, termina o falla. Lo hace con los *hooks* de Claude Code, que avisan a la oficina; nada sale de tu ordenador.

## Qué se ve
- **Estado**: pensando (recibe una orden), trabajando (usa una herramienta), esperando (te pide permiso o espera órdenes), tarea completada, error (3 fallos de herramienta seguidos o un fallo de la API).
- **Tareas**: cada orden que le das aparece como tarea «En curso» y pasa a «Hecha» cuando termina.
- **Actividad**: «Ejecuta npm», «Edita oferta.docx»…
- **Conexión**: «En directo» si ha dado señal en los últimos 10 minutos; si no, «Sin señal».

## Qué se envía (privacidad)
Solo a `127.0.0.1` (tu ordenador), con una clave que se crea sola en `.oficina/clave` (no se sube a GitHub):
- el tipo de aviso (por ejemplo, «ha terminado»);
- de los comandos, **solo la primera palabra** (`npm`, `git`…);
- de los ficheros, **solo el nombre** (sin la carpeta);
- la orden que le das, **recortada a 80 caracteres** (se enseña en la ficha).

No se envían respuestas de Claude, contenido de ficheros, resultados de comandos ni claves.

## Pasos
1. Abre la oficina con `iniciar.bat` (el puente va dentro de ese mismo servidor; mientras esté abierta, recibe avisos).
2. **＋ Nuevo agente** → nombre (por ejemplo, «Claude de Ingeniería») → **Real: lo mueve un Claude Code mío** → Guardar.
3. Clic en el agente → **Conectar a Claude Code** → **Copiar**.
4. Pega la configuración en `.claude/settings.json` del proyecto donde trabaja ese Claude Code (o en `~/.claude/settings.json` para todos). Si el fichero ya tiene un apartado `hooks`, une los eventos en vez de duplicarlos.
5. Reinicia ese Claude Code y dale una orden. El agente pasa a «En directo».

El **nombre** del agente en la oficina debe ser el mismo que el de la configuración copiada (no distingue mayúsculas). Si cambias el nombre, vuelve a copiar la configuración.

## Si algo no funciona
- «No se pudo preparar» en el panel: la oficina no está abierta con `iniciar.bat` (el puente solo existe en el servidor local).
- El agente se queda en «Sin señal»: Claude Code no se ha reiniciado tras pegar la configuración, el nombre no coincide, o Node.js no está en el PATH (`node -v` en una ventana de comandos debe responder).
- Los hooks nunca bloquean a Claude Code: si la oficina está cerrada, el aviso falla en silencio y todo sigue igual.
- Si tu versión de Claude Code no admite `args` en los hooks, usa en su lugar `"command": "node \"C:\\ruta\\puente\\hook.mjs\" --agente \"Nombre\" --puerto 5173"` (sin `args`).

## Qué no está probado todavía
- Con un Claude Code real en Windows: se probó con avisos de ejemplo lanzando `puente/hook.mjs` de verdad (Linux, Chromium). El formato de los datos de los hooks sale de la documentación oficial de Claude Code; conviene comprobarlo la primera vez con un Claude Code real.
- Varios Claude Code a la vez (cada uno con su agente) está cubierto por pruebas automáticas, no con Claude Code real.
