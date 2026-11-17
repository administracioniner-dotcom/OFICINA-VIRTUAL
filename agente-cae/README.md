# Agente CAE: cómo ponerlo en marcha (Windows)

1. Instala Claude Code en tu PC y entra con tu cuenta (una vez). Instala Node.js (ya lo tienes para la oficina).
2. **Probar a mano:** doble clic en `ejecutar-semanal.bat`. Tarda unos minutos; al terminar mira `informes/` (el informe semanal) y `informes/ultima-ejecucion.log`.
3. **Programar:** doble clic en `programar-tarea.bat` → crea la tarea «INER Agente CAE semanal» (miércoles 23:00; si el PC está apagado, se ejecuta al encenderlo).
4. **Verlo en la oficina (opcional):** abre la oficina, crea un agente *real* llamado «Agente CAE» y pulsa «Conectar a Claude Code»; pega esa configuración en `agente-cae/.claude/settings.json`. Si la oficina no está abierta, no pasa nada: solo no verás la actividad.
5. Comprobar la base de conocimiento: `node validar.mjs`.

## Permisos y límites
Solo puede buscar/leer en la web, leer y escribir en esta carpeta y ejecutar `node validar.mjs`. Cualquier otra cosa se deniega. Tope de gasto de 5 USD por ejecución (se cambia en `ejecutar-semanal.bat`). No envía correos ni contacta con nadie.

## Sin probar todavía
Todo esto está preparado pero **no probado en Windows real ni con Claude Code real**: desde la sesión de desarrollo no hay acceso a MITECO ni al BOE. La primera ejecución a mano (paso 2) es la prueba; si falla, mira el `.log`.
