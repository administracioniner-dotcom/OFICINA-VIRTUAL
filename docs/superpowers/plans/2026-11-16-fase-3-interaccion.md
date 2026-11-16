# Fase 3 — Selección, fichas y tareas: plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline).

**Goal:** Al hacer clic en un agente o en un puesto se abre su ficha (departamento, estado, puesto y actividad reciente) con una ventana de tareas simuladas; la barra de zonas sigue permitiendo navegar.

**Architecture:** Un almacén en memoria (`src/state/almacen.ts`) escucha los eventos del `AgentSource` y es la única fuente de verdad (agentes, tareas, actividad, selección). React lo lee con `useSyncExternalStore`; Phaser lo usa para dibujar la selección y para decir qué se ha pulsado.

**Spec:** `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md` (§6 y §7).

## Global Constraints
- Todo lo mostrado es **simulado** y se rotula así («simulada», «· simulación»). Sin red ni datos reales. Textos de tareas genéricos por departamento, nada de datos de negocio inventados.
- Un clic con menos de 5 px de movimiento selecciona; arrastrar sigue moviendo la cámara. Clic en el vacío o `Esc` deselecciona.
- Los paneles flotan sobre el mapa, se pueden cerrar, y no tapan permanentemente el mapa.
- Interfaz en español; accesible con teclado (botones reales, `aria-label`).

## Tareas
1. **Tareas simuladas** (`src/domain/tareas.ts`): `generarTareas(agente, desde)`; 3 tareas por agente según su departamento; tests.
2. **Almacén** (`src/state/almacen.ts`): `crearAlmacen(fuente, puestos)` con `getState/subscribe/seleccionar/dispose`; actividad acotada a 60; la tarea «en curso» avanza con los estados; tests con una fuente falsa.
3. **Cableado**: el simulador y el almacén se crean en `App`; la escena recibe `fuente` y `almacén`.
4. **Interacción en Phaser**: agentes y puestos clicables (umbral de 5 px), anillo de selección, clic en vacío deselecciona.
5. **Interfaz React**: `FichaAgente` (con ventana de tareas), `FichaPuesto`, `Esc` para cerrar.
6. **Verificación**: tests, build, capturas con selección real en navegador, revisión final.
