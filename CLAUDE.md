# INER SMART Virtual Office

Oficina virtual 2D en pixel art (vista desde arriba) para INER SMART ENERGY SYSTEMS, S.L. Es de **uso personal de José, en su ordenador** (sin publicar): sirve para crear sus agentes y ver qué hacen. Hoy los agentes son simulados; más adelante representará el estado de agentes de IA reales. Usuario principal: José (Delegado Comercial Empresas). Habla en español.

## Reglas del proyecto
- Responde **en español, corto y directo**. Pregunta antes de empezar cada fase nueva.
- Proyecto **independiente**: no toca la ERP `CONTROL-DE-OBRAS`, ni Supabase, ni ningún otro repositorio.
- **Sin servicios externos, sin credenciales ni secretos** en el código ni en el repositorio. La única comunicación es el puente local de Claude Code: solo `127.0.0.1`, con clave en `.oficina/clave` (ignorada por git).
- **Simulado vs real:** los agentes de origen `simulado` se mueven solos y se ven como simulados; los de origen `real` solo se mueven con avisos de hooks de Claude Code (`puente/hook.mjs` → servidor de Vite → SSE). No se inventan personas ni datos de negocio.
- **Privacidad del puente:** de los comandos solo la primera palabra, de los ficheros solo el nombre, la orden a 80 caracteres; nunca respuestas ni contenido.
- Antes de decir que algo funciona, compruébalo (`npm run build`, navegador real, capturas). Di claramente lo que no has podido probar (p. ej. Windows real).
- Commits con la línea `Co-Authored-By` de Claude. Flujo: rama nueva → pull request → fusionar con commit de fusión.

## Dónde está todo
- Arranque en Windows: `iniciar.bat` (doble clic). Los agentes del usuario se guardan en el navegador (`localStorage`, dirección fija `localhost:5173`).
- Diseño (pendiente de aprobación de José): `docs/superpowers/specs/2026-11-16-oficina-virtual-design.md`.
- Agentes reales: `docs/conectar-claude-code.md` y `src/puente/` (traducir, núcleo, servidor).
- Agente CAE (investigación de certificados de ahorro energético): `agente-cae/` (alcance residencial e industrial, semanal los miércoles 23:00, web solo para investigar, sin contactar con nadie). Fase 1 hecha; sigue fase 2 (normativa y fichas).
- Plano de la oficina (37 × 20 baldosas): `data/plano-v1.json`.

## Tecnología prevista
Vite + React + TypeScript + Phaser 3. Pixel art generado por código. Fuente pixel autoalojada.
