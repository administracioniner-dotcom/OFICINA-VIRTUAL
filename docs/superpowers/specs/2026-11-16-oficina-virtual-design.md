# INER SMART Virtual Office — diseño de la primera versión

Fecha: 16/11/2026 · Estado: **entrada principal y 9 agentes confirmados; el resto pendiente de visto bueno de José** · Idioma del proyecto: español

## 1. Intención

INER SMART quiere una **oficina virtual 2D en pixel art, vista desde arriba**, con aspecto de videojuego de gestión (tipo simulador de oficina), donde más adelante trabajarán **agentes de IA autónomos** (Claude Code y otros). José, Delegado Comercial Empresas, la usará para ver de un vistazo qué hace cada agente y quién está libre, bloqueado o en error.

La **fase 1** es solo la interfaz visual y sus interacciones básicas, con agentes **simulados**. La estructura se diseña desde ya para que, en la fase 2, los mismos personajes reflejen el estado real de agentes reales sin rehacer la oficina.

### Objetivos
- Que parezca un videojuego, no una web con tarjetas: mapa, personajes con animación, mobiliario, ambiente.
- Cámara con desplazamiento y zoom; seleccionar personajes y escritorios; ficha del agente; ventana de tareas; navegación por zonas.
- Fluida en un navegador en Windows (Chrome, Edge, Firefox).
- Arquitectura modular: el dibujo de la oficina no sabe de dónde vienen los datos de los agentes.

### Fuera de alcance (anti-objetivos)
- Agentes reales, Claude Code, APIs externas, Supabase, login, base de datos, red.
- Tocar la ERP «CONTROL-DE-OBRAS», su base de datos o sus repositorios. Este proyecto es **independiente**.
- Credenciales, claves o secretos en el repositorio.
- Una interfaz llena de tarjetas y paneles que tape el mapa.

## 2. Decisiones ya tomadas por José

1. **La planta** la dibujó él en el editor (`data/plano-v1.json`). Es el plano definitivo de la fase 1.
2. **Isla de 4 puestos** (abajo a la derecha): una mesa compartida con **un puesto por departamento**: Desarrollo, Marketing, CAE y Administración.
3. **Dos entradas** (norte), las que marcó con «Entrada» en el plano.
4. **El mapa se recorta al edificio** (sin margen exterior).
5. Colores corporativos: naranja `#f57c00`, blanco, gris y neutros. Ambiente empresarial moderno y tecnológico.

## 3. Planta de la oficina

Mapa de **37 × 20 baldosas** (origen arriba a la izquierda del edificio). Los datos exactos están en `data/plano-v1.json` (coordenadas ya recortadas; en el editor original hay que restar 8 en x y 10 en y).

| Zona | x | y | ancho | alto | Contenido principal |
|---|---|---|---|---|---|
| Descanso | 1 | 0 | 6 | 10 | Sofá, nevera, dispensador de agua, mesa sin sillas con un microondas encima, futbolín, 2 sillas sueltas, planta |
| Sala de reuniones | 1 | 10 | 6 | 10 | Mesa grande con 8 sillas, televisor |
| Ingeniería (norte) | 7 | 1 | 10 | 4 | 2 escritorios, bicicleta y patinete |
| Ingeniería (sur) | 7 | 10 | 8 | 10 | Mesa de 4 personas; mesa pequeña en (8,16) que es la **zona de comer** del equipo |
| Dirección | 16 | 11 | 10 | 9 | 2 escritorios, mesa pequeña, televisor |
| Compras | 27 | 1 | 5 | 4 | 1 escritorio, impresora |
| Recepción | 32 | 1 | 4 | 4 | 1 escritorio |
| Desarrollo | 30 | 14 | 2 | 2 | 1 puesto en la isla |
| Marketing | 32 | 14 | 2 | 2 | 1 puesto en la isla |
| CAE | 30 | 16 | 2 | 2 | 1 puesto en la isla |
| Administración | 32 | 16 | 2 | 2 | 1 puesto en la isla |

- **Entradas** (norte, fila 0): columnas 10–13 y 20–23. **Confirmado por José:** la principal es la que está cerca de Compras, la central (20–23); la de 10–13 es secundaria.
- **Muros:** perímetro del edificio y tramos interiores. **Mamparas de cristal:** columna 6, que separa Descanso/Sala de reuniones de Ingeniería, con un hueco de 2 baldosas (filas 8–9). **Ventanas:** toda la fachada sur (fila 19, columnas 1–14, 16–25 y 28–35).
- Las zonas sin nombre (centro y derecha) son **pasillos y vestíbulo**.
- **Suelo (decisión de José):** todo el edificio tiene **suelo verde**, pasillos incluidos, **excepto Dirección**, que lleva una **alfombra gris** (la zona completa: columnas 16–25, filas 11–19). El verde es **verde limón** (dicho por José); el tono exacto y el del gris los elige el constructor, y se enseñan en la primera captura. Para el pixel art conviene suavizar un poco la saturación y variar ligeramente las baldosas para que no cansen a la vista.
- **Mobiliario y colores (decisión de José):**
  - **Escritorios y todas las mesas: blancos.**
  - **Sillas ergonómicas de los puestos de trabajo, según el departamento:**
    - **Rojas:** CAE y Desarrollo.
    - **Grises:** Administración, Compras, Recepción, Dirección y Marketing.
    - **Naranjas:** Ingeniería (escritorios y mesa de 4 personas).
  - **Sillas por tipo de mesa** (mandan sobre el departamento): las de las **mesas pequeñas** son **blancas** (incluida la de la zona de comer de Ingeniería); las **sillas sueltas** son **blancas**; las de la **mesa de la Sala de reuniones** son **verdes**.
  - **Estanterías blancas**, con **archivadores rojos** en sus baldas.
  - **Mamparas: cristal completo**, sin marcos.
  - **Logotipo de INER** (solo «iner», sin «SMART»; versión en degradado naranja, de los logos que dio José) en el muro de Dirección, en el extremo más cercano a la entrada principal (a la derecha del televisor, sin placa ni fondo), **mirando hacia la entrada**: está girado 180°, así que en pantalla se ve del revés y se lee desde el norte. Archivo: `src/assets/logo-iner.png`.
  - **Pantallas siempre derechas:** los escritorios, la mesa de reuniones, las mesas de 4 y los televisores se dibujan ya en su orientación final, con la silla en su lado.
  - **Microondas** encima de la mesa sin sillas del Descanso, en la baldosa (2,1). Es un objeto «sobre» otro: no ocupa una baldosa propia ni bloquea el paso. Ya consta en `data/plano-v1.json`.
- Como el suelo ya es verde, **las zonas no se distinguen pintando el suelo**: se marcan con rótulo en pixel art, una línea tenue en el borde y la barra de zonas. Al seleccionar una zona se resalta su rectángulo.
- Total de sitios de trabajo en el plano: 6 escritorios + 4 puestos de la isla + 4 sillas de la mesa de Ingeniería.

### Comprobaciones hechas sobre el plano
Se calculó con un recorrido (BFS) sobre la cuadrícula, con muros, mamparas, ventanas, estanterías y mobiliario como obstáculos y las dos entradas como origen:
- **Todas las zonas, escritorios y mesas son alcanzables** desde las entradas. No hay habitaciones aisladas.
- En el plano original había **ventanas solapadas** (se unifican en una sola fila de baldosas) y **dos estanterías solapadas** en la columna 26 (se tratan como una columna de 4 baldosas, filas 0–3). Hay otra columna de estanterías en la columna 26, filas 14–19.
- La baldosa (6, 19) tiene a la vez mampara y ventana: bloquea el paso y se dibuja como ventana.

### Reglas de puestos y orientación (decisión de diseño)
Los datos del plano no traen sillas ni asientos; se **derivan por reglas**. Como en el editor de José, **las sillas están dentro de la huella** de cada mesa o escritorio:
- `ancho` y `alto` de cada objeto son el **tamaño ya girado** (lo que ocupa en la rejilla). `giro` (0, 90, 180, 270) es el giro en sentido horario del objeto, que se dibuja de frente (con la silla abajo, al sur) cuando `giro` es 0.
- **Escritorio:** un puesto. La silla va en el lado sur con `giro` 0; girando en horario, 90 = oeste, 180 = norte y 270 = este. El ocupante se sienta en ese lado y mira al escritorio.
- **Mesa de reuniones** (`mesa`): una silla por baldosa en sus dos lados largos. La de la Sala de reuniones, en (3,13) con tamaño 2×4, tiene **8 asientos**: columnas 3 y 4, filas 13–16.
- **Mesa de 4 personas** (`mesa4`): 2 asientos por lado largo, en las dos filas centrales. La de Ingeniería, en (12,13), usa las columnas 12 y 13, filas 14 y 15.
- **Isla, un puesto por departamento** (mesa de 4 en (31,14)): Desarrollo (31,15), Marketing (32,15), CAE (31,16) y Administración (32,16). Los de la columna 31 miran al este y los de la 32 al oeste. Cada asiento queda dentro de la zona 2×2 de su departamento.
- El **departamento** de cada asiento es la zona que lo contiene. El color de la silla sale de ese departamento, salvo en las mesas pequeñas, las sillas sueltas y la mesa de reuniones.

## 4. Tecnología recomendada

| Capa | Elección | Por qué |
|---|---|---|
| Entorno 2D | **Phaser 3** | Cámaras, tweens, animaciones, entrada de ratón y render pixel art ya resueltos. |
| Paneles | **React + TypeScript** | Fichas, ventana de tareas y barra de zonas son interfaz normal; encajan mejor en React que dentro del lienzo. |
| Build | **Vite** | Arranque rápido, empaquetado simple. |
| Gráficos | **Pixel art generado por código** (paleta fija, texturas dibujadas al cargar) | Sin packs externos con licencias; estilo propio y coherente; fácil de ajustar. |
| Tipografía | Fuente pixel **autoalojada** (paquete npm) | La app no hace ninguna llamada de red. |
| Datos | Estado propio en memoria + bus de eventos tipado | Sin dependencias extra; sirve igual para simulación y para agentes reales. |

Alternativas descartadas: lienzo y React a pelo (hay que reescribir cámara, animaciones y entrada); solo Phaser sin React (los paneles se complican); packs de sprites comprados (licencia y estilo ajeno).

### Estructura de código

```
src/
  domain/      tipos (Agente, Puesto, Zona, Tarea, Evento), plano cargado de data/
  game/        Phaser: OfficeScene, render (suelo, muros, objetos), cámara, picking
    sprites/   generación procedural de personajes y objetos
    sim/       rejilla, A*, movimiento
  ui/          React: TopBar, ZonaNav, FichaAgente, FichaPuesto, VentanaTareas
  source/      AgentSource (interfaz) + SimulatedSource (fase 1)
  state/       store en memoria + bus de eventos
data/          plano-v1.json
```

## 5. Movimiento de personajes y cámara

### Vista, rejilla y escala
- **Vista:** desde arriba en estilo 3/4 (como los RPG clásicos): los personajes se ven de frente, de espaldas y de lado; los muros son bloques planos con una cara frontal visible para dar volumen; los objetos se ordenan por la fila `y` para que un personaje quede delante o detrás. *(Decisión mía, a confirmar con la primera captura de la fase 1.)*
- Baldosa nativa de **32 px** (se dibuja a doble resolución para llegar al nivel de detalle de la referencia de José: contorno oscuro, sombreado en tres tonos y sombras en el suelo); el mapa completo mide 1.184 × 640 px nativos, escalado por la cámara con zoom.
- Phaser con `pixelArt: true` y `roundPixels`, para que no se vea borroso.
- **Pantalla:** el lienzo ocupa toda la ventana y los paneles (fichas, tareas, barra de zonas) **flotan encima**, con botón para cerrarlos o plegarlos, para no tapar el mapa de forma permanente.
- **Zoom:** el nivel mínimo es «ver todo el mapa» ajustado a la ventana (puede ser fraccionario); por encima, pasos enteros (2×, 3×, 4× de píxel) para que el pixel art se vea nítido. El fondo alrededor del mapa es gris oscuro corporativo.

### Movimiento
- Rejilla de paso: bloquean muros, mamparas, ventanas, estanterías y mobiliario sólido; las entradas son transitables.
- **A\*** de 4 direcciones sobre la rejilla (implementación propia, ~60 líneas, sin dependencia).
- Cada agente tiene un **puesto asignado** (baldosa-asiento y orientación) y, para el estado «en reunión», sitios libres en la sala de reuniones.
- Se mueve de baldosa en baldosa con interpolación (~3 baldosas/s), con animación de caminar de 4 fotogramas por dirección (arriba, abajo, izquierda, derecha). Sentado: animación de trabajo/escritura (2 fotogramas) o parado.
- Si el camino está bloqueado por otro personaje, espera y recalcula; no se atraviesan.

### Cámara
- **Desplazar:** arrastrar con el botón izquierdo sobre el suelo (umbral de 5 px para distinguirlo de un clic), botón central, o teclas WASD/flechas.
- **Zoom:** rueda del ratón sobre el cursor, con niveles escalonados (1×–4×), más botones + y −.
- **Límites:** la cámara no sale del mapa.
- **Navegar por zonas:** barra con las zonas; al pulsar una, la cámara se desplaza y hace zoom hasta ella con una animación suave (~400 ms).
- **Seleccionar:** un clic sobre un personaje o un escritorio lo resalta y abre su panel; clic en el vacío deselecciona.

## 6. Personajes, estados e interacción

- Cada agente: nombre, departamento, puesto, estado, escritorio asignado, tarea actual.
- **Departamentos de la fase 1:** los de las zonas con puestos: Dirección (1 agente, chico), Ingeniería (2), Compras (1), Recepción (1), Desarrollo (1), Marketing (1), CAE (1) y Administración (1). Son **9 agentes** (el segundo escritorio de Dirección queda libre); todos de piel clara y con el pelo marrón o negro. *(Decisión mía, a confirmar por José.)* La barra de zonas tiene una entrada por departamento, más Descanso y Sala de reuniones.
- **Nombres:** en fase 1 son identificadores neutros («Agente CAE 1», «Agente Dirección 2»…), marcados como simulados. No se inventan personas ni datos de negocio.
- **Reuniones:** el estado «en reunión» envía al agente a una de las 8 sillas de la Sala de reuniones. Con 9 agentes y 8 sillas, si no hay silla libre el agente sigue en su puesto (como «pensando»); quedarse de pie junto a la mesa queda para cuando haya más agentes.
- **Estados:** trabajando, pensando, esperando instrucciones, en reunión, tarea completada, error. Cada uno tiene indicador visual encima del personaje (globo o icono pixel) y color propio.
- **Simulación:** `SimulatedSource` cambia estados al azar con reglas simples (p. ej. «en reunión» envía al agente a la sala; «error» lo marca en rojo). Ninguna cifra ni tarea simulada se presenta como real.
- **Fichas:** de agente (departamento, estado, puesto, escritorio, historial corto) y de puesto (quién lo ocupa, zona, equipo). **Ventana de tareas:** lista de tareas simuladas del agente seleccionado, con estado.

## 7. Arquitectura para la fase 2

El mapa y los paneles solo leen del **store**, y el store solo recibe **eventos**. Quien produce los eventos es un `AgentSource`:

```ts
type EstadoAgente = 'trabajando' | 'pensando' | 'esperando' | 'en_reunion' | 'completada' | 'error';

type EventoOficina =
  | { tipo: 'agente.alta'; agente: Agente }
  | { tipo: 'agente.estado'; id: string; estado: EstadoAgente; en: number }
  | { tipo: 'tarea.asignada' | 'tarea.actualizada'; tarea: Tarea }
  | { tipo: 'mensaje'; de: string; a: string; texto: string; en: number }
  | { tipo: 'actividad'; id: string; texto: string; en: number };

interface AgentSource {
  iniciar(): void;
  detener(): void;
  suscribir(fn: (e: EventoOficina) => void): () => void;
}
```

| Futuro | Qué queda preparado en la fase 1 |
|---|---|
| Agentes Claude Code | Un `ClaudeCodeSource` implementa `AgentSource`; la oficina no cambia. |
| Agentes por departamento | Cada agente ya lleva `departamento` y `puesto`; los puestos ya están ligados a zonas. |
| Asignación de tareas | El modelo `Tarea` y el evento `tarea.asignada` ya existen; falta la interfaz para crearlas. |
| Registro de actividad | El store guarda un historial de eventos acotado; en fase 1 lo alimenta el simulador. |
| Comunicación entre agentes | Evento `mensaje`; en fase 1 solo se modelan (opcionalmente globos de «hablar» entre personajes). |
| Panel de supervisión | Lee el mismo store; es otra vista del mismo estado. |

## 8. Plan por fases

| Fase | Contenido | Se da por buena cuando |
|---|---|---|
| **0** | Plano en el editor. **Hecha.** | José aprobó la planta. |
| **1** | Proyecto Vite + React + TS + Phaser; carga de `plano-v1.json`; suelo, muros, mamparas, ventanas, zonas y objetos en pixel art; cámara (arrastrar y zoom). | Se ve la oficina completa y se mueve la cámara a buena velocidad. |
| **2** | Personajes: sprites, animaciones, puestos, A\*, movimiento, estados simulados. | Los agentes se sientan, caminan por los pasillos sin atravesar obstáculos y cambian de estado. |
| **3** | Interacción: selección, ficha de agente, ficha de puesto, ventana de tareas, navegación por zonas. | Se puede consultar cualquier agente y puesto, y saltar a cada zona. |
| **4** | Pulido: ambiente, minimapa (si ayuda), rendimiento, prueba en navegadores, despliegue. | Fluido en Chrome/Edge/Firefox y `npm run build` sin errores. |
| **5** | **Fase 2 del proyecto (futuro, no ahora):** agentes reales por `AgentSource`. | — |

Las fases 1–4 forman la **primera versión visual funcional**. Se pregunta a José antes de empezar cada fase.

## 9. Cómo se comprobará

- `npm run build` debe compilar antes de dar nada por hecho.
- Navegador real (Playwright sobre `vite preview`): capturas y comprobación de que cámara, selección y paneles responden.
- Medición de fotogramas por segundo con 9 agentes (versión normal) y con 14 (prueba de carga: los 9 más 5 puestos sueltos). El tope de la fase 1 es 9; los 14 solo sirven para comprobar el rendimiento.
- **Lo que no se puede probar aquí:** Windows real con Edge/Firefox; solo se prueba un Chromium de pruebas. Se dirá claramente en cada informe y lo comprueba José con una lista de «qué mirar».

## 10. Decisiones abiertas

1. **Entrada principal:** la central (columnas 20–23). **Confirmado por José.**
2. **Número de agentes en la fase 1:** 10 confirmados al principio; después José pidió **un solo agente en Dirección**, así que son **9**. Las 4 sillas de la mesa de Ingeniería quedan como ampliación.
3. **Departamentos con agente:** se propone que los tengan Dirección, Ingeniería, Compras, Recepción y los 4 de la isla (sección 6). Confirmar.
4. **Estilo de vista:** 3/4 con muros con volumen (sección 5). Se enseña en la primera captura y se ajusta si no gusta.
5. **Hospedaje:** primero local; el despliegue estático (p. ej. Vercel) lo decide José más adelante. No hay secretos ni variables de entorno.

## 11. Qué se deja al constructor

Paleta exacta de pixel art, forma de los sprites y de los objetos, tamaño de los iconos de estado, curvas de las animaciones de cámara, velocidades, nombres internos de archivos y la elección de la fuente pixel.
