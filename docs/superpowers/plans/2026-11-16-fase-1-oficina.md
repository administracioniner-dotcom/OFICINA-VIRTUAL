# Fase 1 — Oficina visual con cámara: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página que dibuja la oficina de INER SMART completa en pixel art (suelo, muros, mamparas, ventanas, zonas y mobiliario) con cámara de arrastrar y zoom, y una barra para saltar a cada zona. Sin personajes todavía.

**Architecture:** `data/plano-v1.json` se valida y se convierte en un modelo `Plano` (TypeScript puro, con tests). Phaser 3 dibuja el plano usando texturas pixel art generadas por código. React solo pinta la barra de zonas y los botones de zoom, y habla con Phaser por un bus de eventos tipado.

**Tech Stack:** Vite, React, TypeScript 5.9, Phaser 3.90, Vitest, fuente pixel autoalojada (`@fontsource/press-start-2p`). Playwright (ya instalado en el entorno; no se añade a `package.json`) solo para capturas.

**Spec:** `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`

## Global Constraints

- Proyecto independiente: no tocar la ERP «CONTROL-DE-OBRAS» ni Supabase; sin llamadas de red, credenciales ni secretos.
- Español en toda la interfaz y en los nombres de dominio (`Plano`, `Zona`, `Objeto`).
- Baldosa nativa **16 px**; mapa **37 × 20** baldosas (592 × 320 px). Phaser con `pixelArt: true` y `roundPixels: true`.
- Vista 3/4: muros como bloques con cara frontal visible; objetos ordenados por la fila `y`.
- Lienzo a pantalla completa; paneles **flotan encima** y se pueden plegar.
- Zoom mínimo = «ver todo el mapa» (puede ser fraccionario); por encima, pasos enteros **2×, 3×, 4×**. Fondo alrededor del mapa: gris oscuro.
- Arrastre: umbral de **5 px** para distinguirlo de un clic. Teclas WASD y flechas también mueven la cámara.
- Colores: suelo **verde limón** (algo suavizado, baldosas con ligera variación) en todo el edificio salvo Dirección, que lleva **alfombra gris** (columnas 16–25, filas 11–19). Escritorios y todas las mesas **blancos**. Estanterías **blancas** con archivadores **rojos**. Muros y mamparas: colores a elección del constructor, de acuerdo con la paleta (naranja `#f57c00`, blanco, grises).
- Zonas: no se distinguen por el color del suelo; llevan **rótulo en pixel art**, **línea tenue** en el borde y resaltado al seleccionarlas.
- Sillas (solo se dibujan los asientos de mesas; las de escritorio llegan con los personajes): **mesa de reuniones: verdes; mesas pequeñas y sillas sueltas: blancas; mesa de 4 de Ingeniería: naranjas; mesa 4 de la isla: rojas en Desarrollo y CAE, grises en Marketing y Administración.**
- Microondas: objeto «sobre» la mesa sin sillas, no bloquea el paso.
- `npm run build` debe compilar sin errores antes de entregar. Se pregunta a José antes de empezar la fase 2.

## Review Focus

1. **Baldosa con mampara y ventana a la vez** (6,19): bloquea el paso y se dibuja como ventana. Test en la tarea 2.
2. **Plano con datos mal formados** (zona fuera del mapa, tipo de objeto desconocido, falta una clave): error claro en pantalla con el motivo, no pantalla en blanco. Test en la tarea 2.
3. **Ventana del navegador más pequeña que el mapa o minimizada** (ancho o alto 0): el zoom mínimo no es 0, ni `NaN`, ni `Infinity`. Test en la tarea 5.
4. **Clic con un pequeño temblor del ratón** (< 5 px) no cuenta como arrastre y no mueve la cámara. Test en la tarea 5.
5. **Pantallas de alta densidad (2×) y zoom no entero** durante la animación: el pixel art no se ve borroso al terminar. Captura con `deviceScaleFactor: 2` en la tarea 7.

---

## Mapa de archivos

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
src/main.tsx                      arranque React + Phaser
src/domain/plano.ts               tipos Plano, cargarPlano, rejillas
src/domain/plano.test.ts
src/state/bus.ts                  bus de eventos tipado (React <-> Phaser)
src/game/paleta.ts                colores y tamaños (TILE)
src/game/texturas/*.ts            generadores de pixel art (suelo, muros, objetos, sillas)
src/game/OfficeScene.ts           escena: dibuja plano, zonas, cámara
src/game/camara/zoom.ts           funciones puras de zoom y límites
src/game/camara/zoom.test.ts
src/game/camara/controles.ts      arrastre, rueda, teclado, ir a zona
src/ui/App.tsx, BarraZonas.tsx, Zoom.tsx, ErrorPlano.tsx
scripts/captura.mjs               capturas con Playwright
```

### Task 1: Proyecto base

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/ui/App.tsx`.

**Interfaces:**
- Produces: scripts `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `test` (`vitest run`).

- [ ] **Step 1:** `npm init` y instalar con versiones fijas (sin `^`): `phaser@3.90.0`, `react`, `react-dom`, `typescript@5.9.3`, `vite`, `@vitejs/plugin-react`, `vitest`, `@types/react`, `@types/react-dom`, `@fontsource/press-start-2p`. Elegir la versión de `vite` y del plugin que sean compatibles entre sí.
- [ ] **Step 2:** `tsconfig.json` en modo `strict`, `resolveJsonModule`, `noUncheckedIndexedAccess`. `index.html` con `<div id="juego">` a pantalla completa, fondo gris oscuro `#1d1f24`, sin scroll.
- [ ] **Step 3:** `src/main.tsx` monta `<App />`; `App` muestra un `<div id="juego">` vacío y el texto «INER SMART Virtual Office».
- [ ] **Step 4:** Run `npm run build`. Expected: compila sin errores y crea `dist/`.
- [ ] **Step 5:** Commit `chore: proyecto base Vite + React + TypeScript + Phaser`.

### Task 2: Modelo del plano (`src/domain/plano.ts`)

**Files:** Create `src/domain/plano.ts`, `src/domain/plano.test.ts`. Copiar `data/plano-v1.json` al import con `import datos from '../../data/plano-v1.json'` donde haga falta (no duplicar el archivo).

**Interfaces:**
- Produces:
  - `type Celda = readonly [number, number]`
  - `type TipoZona = 'recepcion'|'direccion'|'cae'|'admin'|'desarrollo'|'reuniones'|'descanso'|'ingenieria'|'compras'|'marketing'`
  - `type TipoObjeto = 'escritorio'|'puerta'|'sofa'|'mesa'|'planta'|'entrada'|'nevera'|'mesapeq'|'mesa4'|'mesasola'|'impresora'|'tele'|'agua'|'silla'|'futbolin'|'patinete'|'bici'|'microondas'`
  - `interface Zona { tipo: TipoZona; x: number; y: number; ancho: number; alto: number }`
  - `interface Objeto { tipo: TipoObjeto; x: number; y: number; ancho: number; alto: number; giro: 0|90|180|270; sobre?: TipoObjeto }`
  - `interface Plano { ancho: number; alto: number; zonas: Zona[]; objetos: Objeto[]; muros: Celda[]; mamparas: Celda[]; ventanas: Celda[]; estanterias: Celda[] }`
  - `class PlanoInvalido extends Error`
  - `cargarPlano(datos: unknown): Plano` (lanza `PlanoInvalido` con un mensaje en español que dice qué falla y dónde)
  - `rejillaBloqueada(p: Plano): boolean[][]` (indexada `[y][x]`)
  - `celdasAlcanzables(p: Plano): boolean[][]` (recorrido desde las baldosas de `entrada`, 4 direcciones)

- [ ] **Step 1: Write the failing tests** en `plano.test.ts` sobre `data/plano-v1.json`:
  - `cargarPlano` devuelve `ancho 37`, `alto 20`, 11 zonas.
  - `rejillaBloqueada(p)[19][6]` es `true` (mampara + ventana) y `[0][10]` es `false` (entrada).
  - `rejillaBloqueada` es `false` en una baldosa de `objeto.sobre` (microondas) siempre que no haya otro bloqueo; el microondas no cuenta como obstáculo.
  - Todas las baldosas de cada zona que no están bloqueadas son alcanzables (`celdasAlcanzables`).
  - `cargarPlano({})` lanza `PlanoInvalido` con mensaje que contiene `cuadricula`.
  - Un plano con una zona fuera del mapa lanza `PlanoInvalido` cuyo mensaje contiene `zona` y el tipo.
  - Un plano con un objeto de tipo `'nave'` lanza `PlanoInvalido` cuyo mensaje contiene `'nave'`.
- [ ] **Step 2:** Run `npx vitest run src/domain/plano.test.ts`. Expected: FAIL (módulo no existe).
- [ ] **Step 3:** Implementar `plano.ts`. Los obstáculos son muros, mamparas, ventanas, estanterías y los objetos sólidos (todos salvo `puerta`, `entrada`, `silla` y los que tienen `sobre`). Las baldosas de `entrada` quedan libres aunque haya muro.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: modelo del plano con validación y rejilla de paso`.

### Task 3: Pixel art por código

**Files:** Create `src/game/paleta.ts`, `src/game/texturas/suelo.ts`, `muros.ts`, `mobiliario.ts`, `sillas.ts`, `registro.ts`, `src/game/texturas/registro.test.ts`.

**Interfaces:**
- Consumes: `TipoObjeto`, `Objeto` de la tarea 2.
- Produces:
  - `paleta.ts`: `export const TILE = 16` y el objeto `PALETA` con los colores nombrados (verde limón, gris alfombra, blanco mobiliario, rojo archivador, naranja corporativo…).
  - `registro.ts`: `generarTexturas(escena: Phaser.Scene): void` crea todas las texturas con claves `suelo-0..3`, `alfombra`, `muro`, `mampara`, `ventana`, `entrada`, `obj-<tipo>`, `silla-<color>` (`verde|blanca|naranja|roja|gris`) y `estanteria`.
  - `TEXTURAS_REQUERIDAS: readonly string[]` con todas las claves.
  - `claveObjeto(o: Objeto): string` devuelve la clave de textura de ese objeto.

- [ ] **Step 1: Write the failing test** (`registro.test.ts`): para cada `Objeto` de `data/plano-v1.json` y para estanterías, ventanas, muros y mamparas, su clave está en `TEXTURAS_REQUERIDAS`; `claveObjeto` de un `mesa` es `obj-mesa`.
- [ ] **Step 2:** Run `npx vitest run src/game/texturas`. Expected: FAIL.
- [ ] **Step 3:** Implementar los generadores dibujando píxel a píxel en un canvas por textura (16 px por baldosa; los objetos grandes se dibujan a su tamaño `ancho × alto` baldosas y orientados con `giro`). Suelo: 4 variantes de verde limón. Muro: bloque con tapa clara y cara frontal oscura de 4 px. Mobiliario blanco con borde gris; estantería blanca con archivadores rojos. Dibujar todos los tipos de `TipoObjeto` con detalle reconocible (monitor, bici, patinete, futbolín…).
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: texturas pixel art generadas por código`.

### Task 4: Escena de la oficina

**Files:** Create `src/game/OfficeScene.ts`, `src/state/bus.ts`; Modify `src/ui/App.tsx`, `src/main.tsx`.

**Interfaces:**
- Consumes: `Plano`, `cargarPlano`, `generarTexturas`, `claveObjeto`.
- Produces:
  - `class OfficeScene extends Phaser.Scene` con `constructor(plano: Plano)`.
  - `bus.ts`: `type EventosOficina = { 'zona:ir': TipoZona; 'zoom:cambiar': 1 | -1; 'camara:zoom': number }`; `const bus: { emit<K extends keyof EventosOficina>(k: K, v: EventosOficina[K]): void; on<K extends keyof EventosOficina>(k: K, fn: (v: EventosOficina[K]) => void): () => void }`.
  - `crearJuego(contenedor: HTMLElement, plano: Plano): Phaser.Game`.

- [ ] **Step 1:** En `OfficeScene.create`: dibujar suelo verde (variando `suelo-0..3` según una función determinista de `(x,y)`), alfombra gris sobre la zona `direccion`, muros, mamparas, ventanas, entradas y objetos (`depth = (y + alto) * TILE`; los objetos con `sobre` van por encima de su soporte). Dibujar para cada zona su rótulo en pixel art (fuente pixel) y una línea tenue de borde.
- [ ] **Step 2:** `main.tsx` carga el plano con `cargarPlano`; si lanza `PlanoInvalido`, `App` muestra `ErrorPlano` con el mensaje, centrado, en texto legible; si no, crea el juego.
- [ ] **Step 3:** Run `npm run build`. Expected: compila.
- [ ] **Step 4:** Run `node scripts/captura.mjs mapa` (ver tarea 7; si aún no existe, abrir `vite preview` y capturar a mano). Expected: se ve la oficina entera, con el suelo verde limón y la alfombra gris en Dirección.
- [ ] **Step 5:** Commit `feat: la escena dibuja la oficina completa`.

### Task 5: Cámara

**Files:** Create `src/game/camara/zoom.ts`, `zoom.test.ts`, `controles.ts`; Modify `OfficeScene.ts`.

**Interfaces:**
- Produces (`zoom.ts`, funciones puras):
  - `zoomAjustar(vista: { ancho: number; alto: number }, mapa: { ancho: number; alto: number }): number` — el mayor zoom con el que cabe el mapa entero; nunca devuelve 0, `NaN` ni `Infinity` (mínimo `0.1`).
  - `zoomSiguiente(actual: number, direccion: 1 | -1, minimo: number): number` — pasa por `minimo`, 2, 3, 4; no sale de ese rango.
  - `limitarCamara(centro: { x: number; y: number }, zoom: number, vista: { ancho: number; alto: number }, mapa: { ancho: number; alto: number }): { x: number; y: number }` — si el mapa cabe, lo centra; si no, no deja ver fuera del mapa.
  - `esArrastre(dx: number, dy: number, umbral?: number): boolean` — `true` si `hypot(dx, dy) >= umbral` (por defecto 5).
- Produces (`controles.ts`): `instalarControles(escena: Phaser.Scene, mapa: { ancho: number; alto: number }): void` y `irAZona(escena: Phaser.Scene, zona: Zona): void` (animación de ~400 ms).

- [ ] **Step 1: Write the failing tests** (`zoom.test.ts`): `zoomAjustar({ancho:1480,alto:800},{ancho:592,alto:320})` es `2.5`; `zoomAjustar({ancho:0,alto:0}, ...)` es `0.1`; `zoomSiguiente(2.5, 1, 2.5)` es `3`; `zoomSiguiente(4, 1, 2.5)` es `4`; `zoomSiguiente(3, -1, 2.5)` es `2.5`; `zoomSiguiente(5, 1, 5)` es `5` (si el mínimo ya supera 4, no hay más niveles); `esArrastre(3,3)` es `false`, `esArrastre(5,0)` es `true`; `limitarCamara` con zoom mínimo centra el mapa y con zoom 4 no sobrepasa los bordes.
- [ ] **Step 2:** Run `npx vitest run src/game/camara`. Expected: FAIL.
- [ ] **Step 3:** Implementar `zoom.ts`. En `controles.ts`: arrastrar con botón izquierdo (solo cuando `esArrastre`) y central, rueda sobre el cursor (un paso por muesca), WASD y flechas, `limitarCamara` en cada cambio, y reajuste del zoom mínimo al cambiar el tamaño de la ventana. Emitir `camara:zoom` por el bus.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: cámara con arrastre, zoom escalonado y límites`.

### Task 6: Barra de zonas y zoom (React)

**Files:** Create `src/ui/BarraZonas.tsx`, `Zoom.tsx`; Modify `App.tsx`, `OfficeScene.ts`.

**Interfaces:**
- Consumes: `bus`, `TipoZona`, `Plano.zonas`.
- Produces: `BarraZonas({ zonas: Zona[] })` — un botón por departamento y por zona (Descanso, Sala de reuniones…) con su nombre en español; `Zoom()` — botones `+` y `−` que emiten `zoom:cambiar`.

- [ ] **Step 1:** La barra flota arriba, se puede plegar con un botón, y al pulsar una zona emite `zona:ir`; la escena la recibe, anima la cámara a esa zona (`irAZona`) y resalta su rectángulo unos segundos.
- [ ] **Step 2:** Estilo corporativo: fondo gris oscuro translúcido, naranja `#f57c00` para el elemento activo, texto legible. Botones accesibles con teclado y con `aria-label` en español.
- [ ] **Step 3:** Run `npm run build`. Expected: compila.
- [ ] **Step 4:** Commit `feat: barra de zonas y botones de zoom`.

### Task 7: Verificación y entrega

**Files:** Create `scripts/captura.mjs`; Modify `README.md`.

- [ ] **Step 1:** `scripts/captura.mjs` arranca `vite preview`, abre la página con Playwright (se carga con `createRequire` desde el entorno; no es dependencia del proyecto) y guarda capturas en `capturas/` (ignorada en git): mapa completo, zoom 4× sobre la isla, tras arrastrar, tras pulsar «Dirección», y una con `deviceScaleFactor: 2`.
- [ ] **Step 2:** Run `npm test && npm run build`. Expected: todo en verde.
- [ ] **Step 3:** Ejecutar el script y comprobar con las capturas: se ven las 11 zonas con su rótulo, el suelo verde limón, la alfombra gris, el mobiliario blanco, las sillas de la mesa de reuniones verdes, el microondas sobre la mesa del Descanso y las dos entradas al norte. Medir los fotogramas por segundo (`game.loop.actualFps`) durante unos segundos de arrastre.
- [ ] **Step 4:** Actualizar `README.md` con cómo arrancar (`npm install`, `npm run dev`) y qué incluye la fase 1. Decir claramente qué no se ha probado (Windows real, Edge y Firefox).
- [ ] **Step 5:** Commit, `git push` a la rama `claude/stoic-goldberg-7v0mp0`, y enseñar a José las capturas **antes** de pasar a la fase 2. No abrir pull request hasta que José lo pida.
