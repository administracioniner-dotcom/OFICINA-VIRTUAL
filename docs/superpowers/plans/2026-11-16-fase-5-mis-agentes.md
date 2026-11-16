# Mis agentes — crear, editar y quitar agentes (uso personal): plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline).

**Goal:** José usa la oficina en su propio ordenador para crear sus agentes (nombre, departamento, puesto, género, aspecto), editarlos y quitarlos; la lista se guarda en el navegador. Siguen simulados hasta conectar agentes reales (paso posterior).

**Architecture:** La lista de agentes vive en un gestor (`src/state/gestor.ts`) que la guarda en `localStorage` y avisa al simulador (`agregar`, `actualizar`, `quitar`), que emite `agente.alta`, `agente.cambio` y `agente.baja`; el almacén y la escena los aplican. Formularios en React.

**Spec:** `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`

## Global Constraints
- Uso personal y local: sin red, sin cuentas, sin secretos. Los datos guardados son solo la lista de agentes (en el navegador).
- Los puestos son los del plano (máximo 14 agentes: 6 escritorios + 4 de la isla + 4 de la mesa de Ingeniería; el de reuniones no es puesto de trabajo).
- Hasta que haya agentes reales, todo sigue rotulado como simulación.
- Español en toda la interfaz; formularios accesibles (etiquetas, errores claros, teclado).
- Quitar un agente pide confirmación dentro de la página.

## Tareas
1. **Reglas** (`src/domain/gestionAgentes.ts`): `puestosLibres`, `validarDatosAgente`, `construirAgente`; tests.
2. **Persistencia** (`src/state/persistencia.ts`): cargar/guardar la lista con datos corruptos o inválidos tolerados; tests con un almacenamiento falso.
3. **Simulador**: `agregar`, `actualizar`, `quitar` con eventos `agente.cambio` y `agente.baja`; libera su silla de reunión; tests.
4. **Almacén**: aplica `agente.cambio` y `agente.baja` (y deselecciona si era el seleccionado); tests.
5. **Escena y actor**: crean, mueven al nuevo puesto y destruyen actores.
6. **Gestor** (`src/state/gestor.ts`): `crear`, `editar`, `quitar` que validan, guardan y avisan al simulador; tests.
7. **Interfaz**: botón «Nuevo agente», formulario (con vista previa del personaje), «Editar» y «Quitar» en la ficha.
8. **Arranque en Windows** (`iniciar.bat`) y README; verificación en navegador (crear, recargar, editar, quitar).
