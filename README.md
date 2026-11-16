# INER SMART Virtual Office

Oficina virtual 2D en pixel art para INER SMART. Estado: **fase 1** (oficina visual con cámara, sin personajes todavía).

## Arrancar
```bash
npm install
npm run dev        # desarrollo
npm run build      # compila (debe pasar antes de entregar)
npm test           # pruebas del plano, texturas y cámara
```

## Qué incluye la fase 1
- Plano de la oficina (`data/plano-v1.json`, 37 × 20 baldosas): suelo verde limón, alfombra gris en Dirección, muros, mamparas, ventanas, entradas y mobiliario en pixel art generado por código.
- Cámara: arrastrar con el ratón (botón izquierdo o central), rueda para el zoom, WASD y flechas.
- Barra de zonas que lleva la cámara a cada zona y resalta su rectángulo; botones de zoom.
- Control de errores: si el plano está mal formado se muestra el motivo en pantalla.

## Comprobaciones (`scripts/captura.mjs`)
Con `npm run build` hecho: `node scripts/captura.mjs prefijo` genera capturas en `capturas/` y mide fotogramas. Usa el Playwright que ya trae el entorno de desarrollo; no es dependencia del proyecto.

## Qué no se ha probado
Windows real con Chrome, Edge y Firefox, ni una tarjeta gráfica real: las pruebas se hicieron en un Chromium de pruebas sin GPU.

## Documentos
- Diseño: `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`
- Plan de la fase 1: `docs/superpowers/plans/2026-11-16-fase-1-oficina.md`
