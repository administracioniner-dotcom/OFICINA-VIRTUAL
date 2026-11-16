import { describe, expect, it } from 'vitest';
import { CONTEXTO_VACIO, traducir, type ContextoAgente } from './traducir';

const T = 1000;
const ir = (crudo: unknown, ctx: ContextoAgente = CONTEXTO_VACIO) => traducir(crudo, 'Ana', T, ctx);

describe('traducir: avisos de hooks de Claude Code → avisos de la oficina', () => {
  it('lo que no es un aviso reconocible no produce nada', () => {
    for (const x of [null, 5, 'x', [], {}, { hook_event_name: 'Raro' }, { hook_event_name: 7 }]) {
      const r = ir(x);
      expect(r.avisos).toEqual([]);
      expect(r.contexto).toEqual(CONTEXTO_VACIO);
    }
  });

  it('SessionStart: conectado y esperando', () => {
    const r = ir({ hook_event_name: 'SessionStart', source: 'startup' });
    expect(r.avisos).toEqual([
      { tipo: 'conexion', agente: 'Ana', conectado: true, t: T },
      { tipo: 'estado', agente: 'Ana', estado: 'esperando', t: T },
    ]);
  });

  it('SessionEnd: desconectado y sin tarea abierta', () => {
    const r = ir({ hook_event_name: 'SessionEnd' }, { tarea: { id: 'a', titulo: 'b' }, fallos: 2 });
    expect(r.avisos).toEqual([
      { tipo: 'tarea', agente: 'Ana', tarea: { id: 'a', titulo: 'b', estado: 'hecha' }, t: T },
      { tipo: 'conexion', agente: 'Ana', conectado: false, t: T },
    ]);
    expect(r.contexto).toEqual(CONTEXTO_VACIO);
  });

  it('UserPromptSubmit: pensando y tarea en curso con la orden recortada a 80 caracteres', () => {
    const larga = 'Haz   esto\ny lo otro ' + 'x'.repeat(200);
    const r = ir({ hook_event_name: 'UserPromptSubmit', prompt: larga, prompt_id: 'p1' });
    const tarea = r.avisos.find((a) => a.tipo === 'tarea');
    expect(tarea).toMatchObject({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'p1', estado: 'en_curso' } });
    const titulo = (tarea as { tarea: { titulo: string } }).tarea.titulo;
    expect(titulo.length).toBeLessThanOrEqual(80);
    expect(titulo.startsWith('Haz esto y lo otro')).toBe(true);
    expect(r.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'pensando', t: T });
    expect(r.contexto.tarea).toEqual({ id: 'p1', titulo });
  });

  it('UserPromptSubmit sin prompt_id inventa un id propio y sin texto pone un título neutro', () => {
    const r = ir({ hook_event_name: 'UserPromptSubmit' });
    expect(r.contexto.tarea?.id).toBe('t-1000');
    expect(r.contexto.tarea?.titulo).toBe('Tarea sin título');
  });

  it('PreToolUse de Bash cuenta solo la primera palabra del comando (privacidad)', () => {
    const r = ir({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'curl -H "Authorization: Bearer SECRETO" https://x' } });
    expect(r.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'trabajando', t: T });
    expect(r.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Ejecuta curl', t: T });
    expect(JSON.stringify(r.avisos)).not.toContain('SECRETO');
  });

  it('PreToolUse de Bash ignora variables de entorno y rutas delante del comando', () => {
    const r = ir({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'FOO=1 /usr/bin/npm run build' } });
    expect(r.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Ejecuta npm', t: T });
  });

  it('PreToolUse de ficheros cuenta solo el nombre del fichero, con rutas de Windows o Linux', () => {
    const w = ir({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'C:\\Users\\Jose\\Documentos\\privado\\oferta.docx' } });
    expect(w.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Edita oferta.docx', t: T });
    const l = ir({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '/home/jose/x/notas.md' } });
    expect(l.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Lee notas.md', t: T });
  });

  it('PreToolUse de otras herramientas: texto genérico sin datos del usuario', () => {
    const g = ir({ hook_event_name: 'PreToolUse', tool_name: 'Grep', tool_input: { pattern: 'clave-secreta' } });
    expect(JSON.stringify(g.avisos)).not.toContain('clave-secreta');
    const m = ir({ hook_event_name: 'PreToolUse', tool_name: 'mcp__correo__enviar', tool_input: { para: 'x@y.es' } });
    expect(m.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Usa una herramienta externa', t: T });
    const w = ir({ hook_event_name: 'PreToolUse', tool_name: 'WebFetch', tool_input: { url: 'https://privado.example/?token=1' } });
    expect(JSON.stringify(w.avisos)).not.toContain('privado');
  });

  it('PostToolUse: vuelve a pensar y reinicia los fallos seguidos', () => {
    const r = ir({ hook_event_name: 'PostToolUse', tool_name: 'Bash' }, { tarea: null, fallos: 2 });
    expect(r.avisos).toEqual([{ tipo: 'estado', agente: 'Ana', estado: 'pensando', t: T }]);
    expect(r.contexto.fallos).toBe(0);
  });

  it('PostToolUseFailure: cuenta fallos y a los 3 seguidos marca error', () => {
    let ctx = CONTEXTO_VACIO;
    const falla = { hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', error: 'Exit code 1\nboom' };
    let r = ir(falla, ctx); ctx = r.contexto;
    expect(ctx.fallos).toBe(1);
    expect(r.avisos.some((a) => a.tipo === 'estado' && a.estado === 'error')).toBe(false);
    r = ir(falla, ctx); ctx = r.contexto;
    r = ir(falla, ctx); ctx = r.contexto;
    expect(ctx.fallos).toBe(3);
    expect(r.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'error', t: T });
    expect(JSON.stringify(r.avisos)).not.toContain('boom');
  });

  it('PostToolUseFailure por interrupción del usuario no cuenta como fallo', () => {
    const r = ir({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', is_interrupt: true }, { tarea: null, fallos: 2 });
    expect(r.contexto.fallos).toBe(2);
  });

  it('Notification: esperando, con texto según el tipo y sin copiar el mensaje', () => {
    const p = ir({ hook_event_name: 'Notification', notification_type: 'permission_prompt', message: 'Claude necesita permiso para borrar C:\\secreto' });
    expect(p.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'esperando', t: T });
    expect(p.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Espera tu permiso', t: T });
    expect(JSON.stringify(p.avisos)).not.toContain('secreto');
    const i = ir({ hook_event_name: 'Notification', notification_type: 'idle_prompt' });
    expect(i.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Espera nuevas órdenes', t: T });
    const o = ir({ hook_event_name: 'Notification' });
    expect(o.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Tiene un aviso', t: T });
  });

  it('Stop: completada y la tarea abierta pasa a hecha', () => {
    const r = ir({ hook_event_name: 'Stop', last_assistant_message: 'texto privado' }, { tarea: { id: 'p1', titulo: 'Haz esto' }, fallos: 1 });
    expect(r.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'completada', t: T });
    expect(r.avisos).toContainEqual({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'p1', titulo: 'Haz esto', estado: 'hecha' }, t: T });
    expect(JSON.stringify(r.avisos)).not.toContain('privado');
    expect(r.contexto).toEqual(CONTEXTO_VACIO);
  });

  it('Stop sin tarea abierta solo marca completada', () => {
    const r = ir({ hook_event_name: 'Stop' });
    expect(r.avisos).toEqual([{ tipo: 'estado', agente: 'Ana', estado: 'completada', t: T }]);
  });

  it('StopFailure: error con texto genérico', () => {
    const r = ir({ hook_event_name: 'StopFailure', error: 'rate_limit', last_assistant_message: 'detalle' });
    expect(r.avisos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'error', t: T });
    expect(r.avisos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Error al responder', t: T });
    expect(JSON.stringify(r.avisos)).not.toContain('detalle');
  });

  it('una orden nueva cierra la tarea anterior que se quedó abierta (p. ej. interrumpida con Esc)', () => {
    const r = ir({ hook_event_name: 'UserPromptSubmit', prompt: 'Otra', prompt_id: 'p2' }, { tarea: { id: 'p1', titulo: 'Vieja' }, fallos: 0 });
    expect(r.avisos).toContainEqual({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'p1', titulo: 'Vieja', estado: 'hecha' }, t: T });
    expect(r.contexto.tarea?.id).toBe('p2');
  });
  it('un fallo de la API también cierra la tarea abierta', () => {
    const r = ir({ hook_event_name: 'StopFailure' }, { tarea: { id: 'p1', titulo: 'Vieja' }, fallos: 0 });
    expect(r.avisos).toContainEqual({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'p1', titulo: 'Vieja', estado: 'hecha' }, t: T });
    expect(r.contexto.tarea).toBeNull();
  });
  it('de un comando solo se enseña la primera palabra si es un nombre normal; si no, nada (privacidad)', () => {
    const texto = (command: string) => (ir({ hook_event_name: 'PreToolUse', tool_name: 'PowerShell', tool_input: { command } }).avisos.find((a) => a.tipo === 'actividad') as { texto: string }).texto;
    expect(texto('$env:GITHUB_TOKEN="ghp_abc123secret"; gh pr list')).toBe('Ejecuta un comando');
    expect(texto('PGPASSWORD="mi clave" psql')).toBe('Ejecuta un comando');
    expect(texto('"C:\\Users\\Jose\\Clientes\\Iberdrola SA\\run.bat"')).toBe('Ejecuta un comando');
    expect(texto('git status')).toBe('Ejecuta git');
  });
});
