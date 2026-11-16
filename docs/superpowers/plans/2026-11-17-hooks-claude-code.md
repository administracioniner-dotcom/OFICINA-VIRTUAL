# Agentes reales con Claude Code (hooks) — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline).

**Goal:** Que un Claude Code en Windows aparezca en la oficina como un agente «real»: su personaje cambia de estado, muestra tareas y actividad según lo que Claude Code hace de verdad, y se marca «en directo» o «sin señal».

**Architecture:** Un script (`puente/hook.mjs`) reenvía los avisos de los hooks de Claude Code a la oficina. La oficina (el servidor de desarrollo que abre `iniciar.bat`) los recibe en una dirección local protegida, los traduce a eventos de la oficina (`src/puente/`) y los manda a la página por un flujo (SSE). La página los une con los agentes simulados en una fuente compuesta.

**Spec:** `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md` §7 y §12.

## Global Constraints
- Todo local: solo escucha en `127.0.0.1`, comprueba `Host` y, para la página, `Sec-Fetch-Site`; los avisos de los hooks llevan una clave generada en el equipo (`.oficina/clave`, ignorada por git). Sin servicios externos ni secretos en el repositorio.
- El hook **nunca** puede bloquear ni romper Claude Code: sale siempre con código 0, no escribe nada y tiene tiempo máximo corto.
- Privacidad: de los comandos solo se muestra su primera palabra; de los ficheros, el nombre; las órdenes del usuario se recortan a 80 caracteres. Nada sale del ordenador.
- Los agentes reales solo cambian por avisos; los simulados siguen simulándose. Todo se rotula («en directo», «simulado»).
- No se prueba con un Claude Code real aquí: se prueba con avisos de ejemplo con el mismo formato que documenta Claude Code.

## Tareas
1. **Agente real o simulado**: campo `origen`, formulario, persistencia, almacén con eventos de tarea, actividad y conexión.
2. **Traducción** (`src/puente/traducir.ts`): aviso de hook → eventos de la oficina; tests.
3. **Núcleo del puente** (`src/puente/nucleo.ts`): estado por agente, anillo de actividad, «sin señal», `completada → esperando`; tests.
4. **Servidor** (`src/puente/servidor.ts`): manejador HTTP con clave, comprobación de `Host`/origen, flujo SSE y configuración; tests con un servidor real.
5. **Hook** (`puente/hook.mjs`) y prueba de extremo a extremo.
6. **Cliente**: `FuenteClaudeCode`, `FuenteCompuesta`, cableado en la página.
7. **Interfaz**: ficha de agente real («en directo», última señal) y «Conectar a Claude Code» con la configuración lista para pegar.
8. **Guía en español** (`docs/conectar-claude-code.md`), verificación en navegador y revisión.
