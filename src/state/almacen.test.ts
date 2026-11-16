import { describe, expect, it } from 'vitest';
import type { Agente, EstadoAgente } from '../domain/agentes';
import type { AgentSource, EventoOficina } from '../source/tipos';
import { crearAlmacen } from './almacen';

class FuenteFalsa implements AgentSource {
  private oyentes = new Set<(e: EventoOficina) => void>();
  iniciar() {}
  detener() {}
  suscribir(fn: (e: EventoOficina) => void) { this.oyentes.add(fn); return () => { this.oyentes.delete(fn); }; }
  emitir(e: EventoOficina) { this.oyentes.forEach((f) => f(e)); }
  get oyentesActivos() { return this.oyentes.size; }
}

const agente = (id: string, estado: EstadoAgente = 'trabajando'): Agente => ({
  id, nombre: `Agente ${id}`, departamento: 'cae', genero: 'm', camisa: '#00897b', variante: 0, asientoId: `s-${id}`, estado,
});
const puestos = [{ id: 's-a', tipo: 'mesa4', zona: 'cae' as const }, { id: 's-b', tipo: 'escritorio', zona: 'compras' as const }, { id: 'r1', tipo: 'reuniones', zona: 'reuniones' as const }];

function nuevo() {
  const fuente = new FuenteFalsa();
  let t = 1000;
  const alm = crearAlmacen(fuente, puestos, () => (t += 10));
  return { fuente, alm };
}

describe('almacén: agentes y tareas', () => {
  it('al dar de alta un agente guarda sus 3 tareas, con la primera en curso si está trabajando', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    const e = alm.getState();
    expect(e.ordenAgentes).toEqual(['a']);
    expect(e.tareas['a']!.map((t) => t.estado)).toEqual(['en_curso', 'pendiente', 'pendiente']);
  });
  it('si el agente no está trabajando, ninguna tarea está en curso', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a', 'esperando') });
    expect(alm.getState().tareas['a']!.every((t) => t.estado === 'pendiente')).toBe(true);
  });
  it('un cambio de estado actualiza el agente y anota la actividad (lo más reciente primero)', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'pensando' });
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'error' });
    const e = alm.getState();
    expect(e.agentes['a']!.estado).toBe('error');
    expect(e.actividad[0]!.texto).toContain('Error');
    expect(e.actividad[1]!.texto).toContain('Pensando');
  });
  it('«completada» cierra la tarea en curso y al volver a trabajar empieza la siguiente', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'completada' });
    expect(alm.getState().tareas['a']!.map((t) => t.estado)).toEqual(['hecha', 'pendiente', 'pendiente']);
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'esperando' });
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'trabajando' });
    expect(alm.getState().tareas['a']!.map((t) => t.estado)).toEqual(['hecha', 'en_curso', 'pendiente']);
  });
  it('cuando se hacen todas, se generan 3 nuevas con ids distintos', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    for (let i = 0; i < 3; i++) {
      fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'trabajando' });
      fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'completada' });
    }
    const t = alm.getState().tareas['a']!;
    expect(t.filter((x) => x.estado === 'hecha')).toHaveLength(3);
    expect(t.filter((x) => x.estado === 'pendiente')).toHaveLength(3);
    expect(new Set(t.map((x) => x.id)).size).toBe(6);
  });
  it('las reuniones quedan anotadas en la actividad', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    fuente.emitir({ tipo: 'agente.reunion', id: 'a', asiento: 'r1' });
    fuente.emitir({ tipo: 'agente.reunion', id: 'a', asiento: null });
    const textos = alm.getState().actividad.map((x) => x.texto);
    expect(textos[0]).toContain('vuelve');
    expect(textos[1]).toContain('sala de reuniones');
  });
  it('la actividad se acota a 60 anotaciones', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    for (let i = 0; i < 100; i++) fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: i % 2 ? 'pensando' : 'trabajando' });
    expect(alm.getState().actividad).toHaveLength(60);
  });
  it('un evento de un agente desconocido no rompe nada', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.estado', id: 'zzz', estado: 'error' });
    expect(alm.getState().ordenAgentes).toEqual([]);
  });
});

describe('almacén: selección y suscripciones', () => {
  it('selecciona un agente o un puesto, y se deselecciona', () => {
    const { fuente, alm } = nuevo();
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    alm.seleccionar({ tipo: 'agente', id: 'a' });
    expect(alm.getState().seleccion).toEqual({ tipo: 'agente', id: 'a' });
    alm.seleccionar({ tipo: 'puesto', id: 's-a' });
    expect(alm.getState().seleccion).toEqual({ tipo: 'puesto', id: 's-a' });
    alm.seleccionar(null);
    expect(alm.getState().seleccion).toBeNull();
  });
  it('no selecciona algo que no existe', () => {
    const { alm } = nuevo();
    alm.seleccionar({ tipo: 'agente', id: 'nadie' });
    alm.seleccionar({ tipo: 'puesto', id: 'no-hay' });
    expect(alm.getState().seleccion).toBeNull();
  });
  it('avisa a los suscriptores solo cuando algo cambia, y la instantánea es estable si no cambia', () => {
    const { fuente, alm } = nuevo();
    let avisos = 0;
    const quitar = alm.subscribe(() => avisos++);
    const a = alm.getState();
    expect(alm.getState()).toBe(a);
    fuente.emitir({ tipo: 'agente.alta', agente: agente('a') });
    expect(avisos).toBe(1);
    expect(alm.getState()).not.toBe(a);
    alm.seleccionar(null);   // ya estaba sin selección: no cambia
    expect(avisos).toBe(1);
    quitar();
    fuente.emitir({ tipo: 'agente.estado', id: 'a', estado: 'pensando' });
    expect(avisos).toBe(1);
  });
  it('dispose deja de escuchar a la fuente', () => {
    const { fuente, alm } = nuevo();
    expect(fuente.oyentesActivos).toBe(1);
    alm.dispose();
    expect(fuente.oyentesActivos).toBe(0);
  });
  it('conoce los puestos para poder describirlos', () => {
    const { alm } = nuevo();
    expect(alm.getState().puestos['s-b']).toEqual({ id: 's-b', tipo: 'escritorio', zona: 'compras' });
  });
});
