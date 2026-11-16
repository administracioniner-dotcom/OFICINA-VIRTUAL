# Agente de Administración (correo de Outlook) — pendiente

Estado: **en pausa** (José comprueba algunas cosas). Sin código todavía.

## Decidido
- Los agentes reales serán **Claude Code en Windows**; avisarán a la oficina con *hooks* (la oficina recibiría los avisos en una dirección local, con una clave generada en el equipo).
- El agente de Administración **no depende de Microsoft Graph**: el origen de los correos será un módulo intercambiable (carpeta de Power Automate, Outlook de escritorio o Graph).
- José usa el **nuevo Outlook**: la automatización del Outlook de escritorio (COM) no sirve salvo que se vuelva al clásico.
- Solo lectura; los borradores se guardan como texto en la oficina, no en Outlook.

## Ruta preferida
Power Automate: flujo «cuando llegue un correo (CAE / ISO / calculadora) → guardar adjuntos y un fichero con los datos en una carpeta de OneDrive». El agente solo lee esa carpeta sincronizada.

## Dudas abiertas (para José)
1. Comprobar si puede crear flujos en `make.powerautomate.com` (Crear → Flujo de nube automatizado).
2. Buzón: personal, compartido o carpeta con regla.
3. Qué contenido de los correos puede ir a Claude (propuesta por defecto: asunto, remitente, nombres de adjuntos y un extracto corto; nunca documentos fiscales ni bancarios). Consultar protección de datos.
4. 3–5 correos de ejemplo de la calculadora CAE, anonimizados.
5. Autorizar por escrito la excepción a la regla «sin servicios externos» para este módulo.
6. Dónde se ejecuta: en su PC con el Programador de tareas (asumido).

## Siguiente paso cuando se retome
Fase 1 del encargo: arquitectura y permisos (sin programar).
