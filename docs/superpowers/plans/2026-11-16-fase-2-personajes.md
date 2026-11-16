# Fase 2 — Personajes, puestos, movimiento y estados simulados: plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task.

**Goal:** 10 agentes simulados (humanos en pixel art) sentados en sus puestos, que caminan por los pasillos sin atravesar obstáculos y cambian de estado solos, siempre marcados como simulación.

**Architecture:** El dominio (puestos, agentes, rutas A\*, simulador) es TypeScript puro con tests. Phaser solo dibuja: `Actor` mueve un sprite siguiendo una ruta y la escena aplica los eventos del `AgentSource`. El simulador implementa la interfaz `AgentSource` del diseño (§7).

**Spec:** `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`

## Global Constraints
- Sin red, sin credenciales; todo lo mostrado es **simulado** y se ve como tal («· simulación»). Nombres neutros («Agente CAE 1»).
- Agentes (10): Dirección 2 (1 chico, 1 chica — decisión mía a confirmar), Ingeniería 2 (chicos), Compras 1 (chica), Recepción 1 (chica), Desarrollo 1 (chica), Marketing 1 (chica), CAE 1 (chico), Administración 1 (chica).
- Caminar ≈ 3 baldosas/s, 4 direcciones; A\* de 4 direcciones; nunca atravesar muros ni mobiliario.
- Estados: trabajando, pensando, esperando, en_reunion, completada, error. «En reunión»: hasta 8 sillas de la Sala de reuniones; si faltan, de pie junto a la mesa.
- Ningún cambio de la cámara ni del aspecto de fase 1 salvo separar sillas de mesas para poder sentar a la gente.

## Tareas
1. **Puestos** (`src/domain/asientos.ts`): `asientosDelPlano(p: Plano): Asiento[]` con id, tipo (`escritorio|mesa4|reuniones`), posición en px de la silla, `mira: Direccion`, lado de la mesa, `acceso: Celda` (baldosa libre desde la que se llega) y `zona`. Tests: 6 escritorios + 4 isla + 4 mesa de Ingeniería + 8 reuniones; todos los accesos alcanzables desde las entradas; los 4 puestos de la isla caen en Desarrollo, Marketing, CAE y Administración.
2. **Rutas** (`src/domain/rutas.ts`): `buscarRuta(bloqueada, desde, hasta): Celda[] | null` (A\*, 4 direcciones) y `avanzar(est: EstadoMovimiento, ruta, dt, velocidad)`. Tests: camino mínimo, rodea obstáculos, `null` si no hay, el paso nunca cruza una baldosa bloqueada.
3. **Agentes** (`src/domain/agentes.ts`): tipos `Agente`, `EstadoAgente`, `crearAgentes(asientos): Agente[]` con nombre, departamento, género, color de camisa y asiento. Tests: 10 agentes, reparto por departamento, asientos únicos.
4. **Simulador** (`src/source/simulado.ts`): `AgentSource` con `iniciar/detener/suscribir` y eventos `agente.alta`, `agente.estado`, `agente.reunion`. Tests con reloj y azar inyectados: transiciones válidas, máximo 8 en reunión, `completada` y `error` vuelven a `esperando`.
5. **Sillas separadas** (`registro.ts`, `claves.ts`): cada escritorio/mesa se dibuja en dos capas (`-mesa` y `-sillas`) para poder poner a la persona entre la silla y la mesa.
6. **Sprites y actores** (`src/game/Actor.ts`): hoja de sprites por agente, caminar y sentarse, globo de estado, profundidad correcta. 
7. **Escena**: crea los actores, aplica los eventos del simulador, rótulo «simulación» ya existente. Verificación: capturas en varios instantes, medición de fotogramas con 10 y 14 agentes, `npm test` y `npm run build`.
