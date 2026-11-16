import type { AvisoOficina } from './tipos';

/** Lo que hay que recordar entre avisos de un mismo agente. */
export interface ContextoAgente {
  tarea: { id: string; titulo: string } | null;
  /** Fallos de herramienta seguidos. */
  fallos: number;
}
export const CONTEXTO_VACIO: ContextoAgente = { tarea: null, fallos: 0 };

export interface Traduccion { avisos: AvisoOficina[]; contexto: ContextoAgente }

const MAX_TITULO = 80;
const FALLOS_PARA_ERROR = 3;

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const objeto = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const recortar = (s: string, max: number) => {
  const limpio = s.replace(/\s+/g, ' ').trim();
  return limpio.length <= max ? limpio : limpio.slice(0, max - 1).trimEnd() + '…';
};

/** Solo el nombre del fichero (rutas de Windows o Linux): el resto de la ruta es privado. */
const nombreFichero = (ruta: string) => recortar(ruta.split(/[\\/]/).filter(Boolean).pop() ?? '', 40);

/** Solo la primera palabra del comando, sin variables de entorno ni ruta. */
const primeraPalabra = (comando: string) => {
  const trozos = comando.trim().split(/\s+/);
  const orden = trozos.find((t) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) ?? '';
  return recortar(orden.split(/[\\/]/).pop() ?? '', 30);
};

const VERBOS_FICHERO: Record<string, string> = {
  Read: 'Lee', Edit: 'Edita', Write: 'Escribe', MultiEdit: 'Edita', NotebookEdit: 'Edita',
};

function actividadDeHerramienta(nombre: string, entrada: Record<string, unknown>): string {
  if (nombre === 'Bash' || nombre === 'PowerShell') {
    const p = primeraPalabra(texto(entrada.command));
    return p ? `Ejecuta ${p}` : 'Ejecuta un comando';
  }
  const verbo = VERBOS_FICHERO[nombre];
  if (verbo) {
    const f = nombreFichero(texto(entrada.file_path) || texto(entrada.notebook_path));
    return f ? `${verbo} ${f}` : `${verbo} un fichero`;
  }
  if (nombre === 'Grep' || nombre === 'Glob') return 'Busca en el proyecto';
  if (nombre === 'WebFetch' || nombre === 'WebSearch') return 'Consulta la web';
  if (nombre.startsWith('mcp__')) return 'Usa una herramienta externa';
  if (nombre === 'Task' || nombre === 'Agent') return 'Delega en un subagente';
  return `Usa ${recortar(nombre.replace(/[^\w .-]/g, ''), 30) || 'una herramienta'}`;
}

const TEXTO_NOTIFICACION: Record<string, string> = {
  permission_prompt: 'Espera tu permiso',
  idle_prompt: 'Espera nuevas órdenes',
};

/** Convierte un aviso de hook de Claude Code en avisos de la oficina. Nunca copia contenido privado. */
export function traducir(crudo: unknown, agente: string, t: number, previo: ContextoAgente): Traduccion {
  const d = objeto(crudo);
  const evento = texto(d.hook_event_name);
  const estado = (e: Extract<AvisoOficina, { tipo: 'estado' }>['estado']): AvisoOficina => ({ tipo: 'estado', agente, estado: e, t });
  const actividad = (x: string): AvisoOficina => ({ tipo: 'actividad', agente, texto: x, t });
  const sinCambios = (): Traduccion => ({ avisos: [], contexto: previo });

  switch (evento) {
    case 'SessionStart':
      return { avisos: [{ tipo: 'conexion', agente, conectado: true, t }, estado('esperando')], contexto: { tarea: null, fallos: 0 } };
    case 'SessionEnd':
      return { avisos: [{ tipo: 'conexion', agente, conectado: false, t }], contexto: CONTEXTO_VACIO };
    case 'UserPromptSubmit': {
      const id = texto(d.prompt_id) || `t-${t}`;
      const titulo = recortar(texto(d.prompt), MAX_TITULO) || 'Tarea sin título';
      return {
        avisos: [estado('pensando'), { tipo: 'tarea', agente, tarea: { id, titulo, estado: 'en_curso' }, t }],
        contexto: { tarea: { id, titulo }, fallos: 0 },
      };
    }
    case 'PreToolUse':
      return {
        avisos: [estado('trabajando'), actividad(actividadDeHerramienta(texto(d.tool_name), objeto(d.tool_input)))],
        contexto: previo,
      };
    case 'PostToolUse':
      return { avisos: [estado('pensando')], contexto: { ...previo, fallos: 0 } };
    case 'PostToolUseFailure': {
      if (d.is_interrupt === true) return { avisos: [estado('pensando')], contexto: previo };
      const fallos = previo.fallos + 1;
      const avisos: AvisoOficina[] = [actividad('Una herramienta ha fallado')];
      avisos.unshift(estado(fallos >= FALLOS_PARA_ERROR ? 'error' : 'pensando'));
      return { avisos, contexto: { ...previo, fallos } };
    }
    case 'Notification':
      return {
        avisos: [estado('esperando'), actividad(TEXTO_NOTIFICACION[texto(d.notification_type)] ?? 'Tiene un aviso')],
        contexto: previo,
      };
    case 'Stop': {
      const avisos: AvisoOficina[] = [estado('completada')];
      if (previo.tarea) avisos.push({ tipo: 'tarea', agente, tarea: { ...previo.tarea, estado: 'hecha' }, t });
      return { avisos, contexto: CONTEXTO_VACIO };
    }
    case 'StopFailure':
      return { avisos: [estado('error'), actividad('Error al responder')], contexto: { ...previo, fallos: 0 } };
    default:
      return sinCambios();
  }
}
