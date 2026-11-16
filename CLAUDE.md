# INER SMART Virtual Office

Oficina virtual 2D en pixel art (vista desde arriba) para INER SMART ENERGY SYSTEMS, S.L. Más adelante representará el estado de agentes de IA autónomos. Usuario principal: José (Delegado Comercial Empresas). Habla en español.

## Reglas del proyecto
- Responde **en español, corto y directo**. Pregunta antes de empezar cada fase nueva.
- Proyecto **independiente**: no toca la ERP `CONTROL-DE-OBRAS`, ni Supabase, ni ningún otro repositorio.
- **Sin servicios externos, sin llamadas de red, sin credenciales ni secretos** en el código ni en el repositorio.
- **No hay agentes reales todavía:** todo lo que muestre la interfaz es simulado y debe verse como simulado. No se inventan personas ni datos de negocio.
- Antes de decir que algo funciona, compruébalo (`npm run build`, navegador real, capturas). Di claramente lo que no has podido probar (p. ej. Windows real).
- Commits con la línea `Co-Authored-By` de Claude. Flujo: rama nueva → pull request → fusionar con commit de fusión.

## Dónde está todo
- Diseño (pendiente de aprobación de José): `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`.
- Plano de la oficina (37 × 20 baldosas): `data/plano-v1.json`.

## Tecnología prevista
Vite + React + TypeScript + Phaser 3. Pixel art generado por código. Fuente pixel autoalojada.
