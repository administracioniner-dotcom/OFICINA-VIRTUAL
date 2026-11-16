import { describe, expect, it } from 'vitest';
import { crearNucleo } from './nucleo';
import type { AvisoOficina } from './tipos';

function montar() {
  let t = 100;
  const pendientes: Array<{ fn: () => void; ms: number; vivo: boolean }> = [];
  const nucleo = crearNucleo({
    reloj: () => t,
    temporizador: (fn, ms) => { const p = { fn, ms, vivo: true }; pendientes.push(p); return () => { p.vivo = false; }; },
  });
  const vistos: AvisoOficina[] = [];
  nucleo.suscribir((a) => vistos.push(a));
  const disparar = () => { for (const p of pendientes.splice(0)) if (p.vivo) p.fn(); };
  return { nucleo, vistos, avanzar: (ms: number) => { t += ms; }, disparar, pendientes };
}
const hook = (agente: string, evento: string, extra: object = {}) => ({ agente, hook_event_name: evento, ...extra });

describe('núcleo del puente', () => {
  it('avisos sin nombre de agente válido se ignoran', () => {
    const { nucleo, vistos } = montar();
    for (const x of [null, 3, {}, { hook_event_name: 'Stop' }, { agente: '', hook_event_name: 'Stop' }, { agente: 'x'.repeat(61), hook_event_name: 'Stop' }, { agente: 5, hook_event_name: 'Stop' }]) nucleo.recibir(x);
    expect(vistos).toEqual([]);
  });

  it('traduce y reparte a los suscriptores con la hora del reloj', () => {
    const { nucleo, vistos } = montar();
    nucleo.recibir(hook('Ana', 'PreToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test' } }));
    expect(vistos).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'trabajando', t: 100 });
    expect(vistos).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Ejecuta npm', t: 100 });
  });

  it('recuerda la tarea abierta de cada agente por separado', () => {
    const { nucleo, vistos } = montar();
    nucleo.recibir(hook('Ana', 'UserPromptSubmit', { prompt: 'Tarea de Ana', prompt_id: 'a1' }));
    nucleo.recibir(hook('Luis', 'UserPromptSubmit', { prompt: 'Tarea de Luis', prompt_id: 'l1' }));
    nucleo.recibir(hook('Ana', 'Stop'));
    expect(vistos).toContainEqual({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'a1', titulo: 'Tarea de Ana', estado: 'hecha' }, t: 100 });
    expect(vistos.filter((a) => a.tipo === 'tarea' && a.agente === 'Luis' && a.tarea.estado === 'hecha')).toEqual([]);
  });

  it('tras Stop vuelve a esperando a los ~3 s, salvo que llegue otro aviso antes', () => {
    const a = montar();
    a.nucleo.recibir(hook('Ana', 'Stop'));
    expect(a.pendientes[0]?.ms).toBe(3000);
    a.avanzar(3000); a.disparar();
    expect(a.vistos.at(-1)).toEqual({ tipo: 'estado', agente: 'Ana', estado: 'esperando', t: 3100 });

    const b = montar();
    b.nucleo.recibir(hook('Ana', 'Stop'));
    b.nucleo.recibir(hook('Ana', 'UserPromptSubmit', { prompt: 'otra' }));
    const antes = b.vistos.length;
    b.disparar();
    expect(b.vistos.length).toBe(antes);
  });

  it('la instantánea devuelve lo último que se sabe de cada agente, para quien se conecta ahora', () => {
    const { nucleo } = montar();
    nucleo.recibir(hook('Ana', 'SessionStart'));
    nucleo.recibir(hook('Ana', 'UserPromptSubmit', { prompt: 'Haz algo', prompt_id: 'p' }));
    nucleo.recibir(hook('Ana', 'PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/a/b/c.ts' } }));
    nucleo.recibir(hook('Luis', 'SessionStart'));
    const snap = nucleo.instantanea();
    expect(snap).toContainEqual({ tipo: 'conexion', agente: 'Ana', conectado: true, t: 100 });
    expect(snap).toContainEqual({ tipo: 'tarea', agente: 'Ana', tarea: { id: 'p', titulo: 'Haz algo', estado: 'en_curso' }, t: 100 });
    expect(snap).toContainEqual({ tipo: 'actividad', agente: 'Ana', texto: 'Lee c.ts', t: 100 });
    expect(snap).toContainEqual({ tipo: 'estado', agente: 'Ana', estado: 'trabajando', t: 100 });
    expect(snap.filter((a) => a.agente === 'Luis')).toHaveLength(2);
  });

  it('desuscribirse deja de recibir', () => {
    const { nucleo } = montar();
    const vistos: AvisoOficina[] = [];
    const baja = nucleo.suscribir((a) => vistos.push(a));
    baja();
    nucleo.recibir(hook('Ana', 'Stop'));
    expect(vistos).toEqual([]);
  });

  it('un suscriptor que falla no impide avisar a los demás', () => {
    const { nucleo, vistos } = montar();
    nucleo.suscribir(() => { throw new Error('roto'); });
    nucleo.recibir(hook('Ana', 'Stop'));
    expect(vistos.length).toBeGreaterThan(0);
  });

  it('no admite más de 50 agentes distintos (evita crecer sin límite)', () => {
    const { nucleo, vistos } = montar();
    for (let i = 0; i < 60; i++) nucleo.recibir(hook(`Agente ${i}`, 'SessionStart'));
    expect(new Set(vistos.map((a) => a.agente)).size).toBe(50);
  });
});
