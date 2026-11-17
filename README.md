# INER SMART Virtual Office

Oficina virtual 2D en pixel art para INER SMART, de **uso personal** (en tu propio ordenador). Muestra a tus agentes en su puesto, caminando y cambiando de estado, y te deja crearlos, editarlos y quitarlos. Los agentes son **simulados**, salvo los que marques como **reales**: esos los mueve un Claude Code tuyo (ver `docs/conectar-claude-code.md`).

## Usarla en Windows (doble clic)
1. Instala **Node.js (versión LTS)** desde https://nodejs.org (solo la primera vez).
2. Haz doble clic en `iniciar.bat`. La primera vez instala lo necesario; después abre la oficina en el navegador (`http://localhost:5173`).
3. Deja la ventana negra abierta mientras la uses. Para cerrar la oficina, ciérrala.

**Tus agentes se guardan en el navegador**, ligados a la dirección `localhost:5173`: ábrela siempre con `iniciar.bat` y en el mismo navegador. Si borras los datos del sitio, la lista vuelve a los 9 agentes de ejemplo.

## Actualizar (si la carpeta se bajó con `git clone`)
Doble clic en `actualizar.bat`: baja las novedades de GitHub y reinstala lo necesario. Después, cierra y abre la oficina con `iniciar.bat`.

## Crear y gestionar agentes
- **＋ Nuevo agente** (arriba a la izquierda): nombre, puesto de trabajo libre, chico o chica y aspecto.
- Clic en un agente → su ficha, con **Editar** y **Quitar**.
- Los puestos son los del plano: hay 14 puestos de trabajo (6 escritorios, 4 en la mesa compartida de la derecha y 4 en la de Ingeniería).


## Arrancar
```bash
npm install
npm run dev        # desarrollo
npm run build      # compila (debe pasar antes de entregar)
npm test           # pruebas del plano, texturas y cámara
```

## Qué incluye
- Plano de la oficina (`data/plano-v1.json`, 37 × 20 baldosas): suelo verde limón, alfombra gris en Dirección, muros, mamparas, ventanas, entradas y mobiliario en pixel art generado por código.
- Cámara: arrastrar con el ratón (botón izquierdo o central), rueda para el zoom, WASD y flechas.
- Barra de zonas que lleva la cámara a cada zona y resalta su rectángulo; botones de zoom.
- Control de errores: si el plano está mal formado se muestra el motivo en pantalla.

## Agentes reales (Claude Code)
**＋ Nuevo agente** → «Real» → en su ficha, **Conectar a Claude Code** (guía: `docs/conectar-claude-code.md`). Prueba en navegador: `npm run build && node scripts/verificar-claude-code.mjs`.

## Agente CAE (en preparación)
Carpeta `agente-cae/`: instrucciones del agente (`CLAUDE.md`), formato de su base de conocimiento (`FORMATO.md`) y validador (`node agente-cae/validar.mjs`). Fase 1 hecha; fase 2 preparada (tarea semanal y scripts, sin probar en Windows). Miércoles 23:00. Ver `agente-cae/README.md`.

## Comprobaciones (`scripts/captura.mjs`)
Con `npm run build` hecho: `node scripts/captura.mjs prefijo` genera capturas en `capturas/` y mide fotogramas. Usa el Playwright que ya trae el entorno de desarrollo; no es dependencia del proyecto.

## Qué no se ha probado
Windows real con Chrome, Edge y Firefox, ni una tarjeta gráfica real: las pruebas se hicieron en un Chromium de pruebas sin GPU.

## Documentos
- Conectar un Claude Code real: `docs/conectar-claude-code.md`
- Diseño: `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`
- Plan de la fase 1: `docs/superpowers/plans/2026-11-16-fase-1-oficina.md`
