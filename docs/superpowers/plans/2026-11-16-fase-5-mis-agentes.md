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

## Resultado de la revisión final y pendientes
- **Corregido:** con dos pestañas abiertas una pisaba la lista de la otra (ahora se sincronizan por el evento `storage`); no avisaba si el navegador bloquea el guardado; arrastrar el ratón fuera del formulario lo cerraba y perdía lo escrito; datos guardados con un aspecto fuera de rango podían romper el dibujo. Además: el aspecto pasa de 8 a 12 opciones (los agentes de ejemplo ya usaban el 9.º), el departamento se corrige al de la zona del puesto y se evitan avisos de Phaser al crear personajes.
- **Pendiente (menores):** al editar a un agente que está en una reunión, vuelve a su puesto pero el simulador sigue dándolo por «en reunión» unos segundos; la tecla Esc en el formulario ya no deselecciona (hecho), pero el foco del teclado no queda atrapado dentro del formulario ni vuelve al botón al cerrar; la confirmación de «Quitar» no recibe el foco; `iniciar.bat` solo reinstala si falta `node_modules` (tras un `git pull` con dependencias nuevas hay que ejecutar `npm install`); el nombre cuenta los emojis como dos caracteres.
