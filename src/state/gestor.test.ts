import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { crearAgentes, type Agente } from '../domain/agentes';
import { puestosLibres } from '../domain/gestionAgentes';
import { cargarPlano } from '../domain/plano';
import { asientosDelPlano } from '../game/asientos';
import { crearGestor } from './gestor';
import { CLAVE_AGENTES, cargarAgentes, type Almacenamiento } from './persistencia';

const asientos = asientosDelPlano(cargarPlano(datos));
const base = crearAgentes(asientos);

function entorno() {
  const d: Record<string, string> = {};
  const alm: Almacenamiento = { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; } };
  const llamadas: string[] = [];
  const fuente = {
    agregar: (a: Agente) => llamadas.push(`agregar:${a.id}`),
    actualizar: (a: Agente) => llamadas.push(`actualizar:${a.id}`),
    quitar: (id: string) => llamadas.push(`quitar:${id}`),
  };
  const gestor = crearGestor({ almacenamiento: alm, fuente, asientos, inicial: base });
  return { gestor, alm, llamadas, d };
}
const libre = () => puestosLibres(asientos, base)[0]!;

describe('gestor de agentes', () => {
  it('empieza con los agentes iniciales', () => {
    expect(entorno().gestor.agentes()).toEqual(base);
  });
  it('crear añade el agente, avisa al simulador y lo guarda', () => {
    const { gestor, alm, llamadas } = entorno();
    const a = gestor.crear({ nombre: 'Lucía', asientoId: libre().id, genero: 'f', variante: 1 });
    expect(gestor.agentes()).toHaveLength(base.length + 1);
    expect(llamadas).toEqual([`agregar:${a.id}`]);
    const guardados = cargarAgentes(alm, [], asientos);
    expect(guardados.map((x) => x.nombre)).toContain('Lucía');
  });
  it('crear con datos inválidos lanza, y no avisa ni guarda nada', () => {
    const { gestor, llamadas, d } = entorno();
    expect(() => gestor.crear({ nombre: '', asientoId: libre().id, genero: 'f', variante: 1 })).toThrowError(/nombre/i);
    expect(llamadas).toEqual([]);
    expect(d[CLAVE_AGENTES]).toBeUndefined();
  });
  it('editar cambia los datos, conserva el id, avisa y guarda', () => {
    const { gestor, alm, llamadas } = entorno();
    const a0 = base[0]!;
    const e = gestor.editar(a0.id, { nombre: 'Nuevo', asientoId: a0.asientoId, genero: a0.genero, variante: 5 });
    expect(e.id).toBe(a0.id);
    expect(llamadas).toEqual([`actualizar:${a0.id}`]);
    expect(cargarAgentes(alm, [], asientos).find((x) => x.id === a0.id)!.nombre).toBe('Nuevo');
  });
  it('editar a alguien que no existe lanza', () => {
    const { gestor } = entorno();
    expect(() => gestor.editar('nadie', { nombre: 'x', asientoId: libre().id, genero: 'm', variante: 0 })).toThrowError(/no existe/i);
  });
  it('quitar da de baja, avisa, guarda y deja el puesto libre para otro', () => {
    const { gestor, alm, llamadas } = entorno();
    const cae = base.find((a) => a.departamento === 'cae')!;
    gestor.quitar(cae.id);
    expect(llamadas).toEqual([`quitar:${cae.id}`]);
    expect(cargarAgentes(alm, [], asientos).some((x) => x.id === cae.id)).toBe(false);
    const otro = gestor.crear({ nombre: 'Sustituto', asientoId: cae.asientoId, genero: 'm', variante: 0 });
    expect(otro.asientoId).toBe(cae.asientoId);
  });
  it('quitar a alguien que no existe no hace nada', () => {
    const { gestor, llamadas } = entorno();
    gestor.quitar('nadie');
    expect(llamadas).toEqual([]);
  });
  it('si no se puede guardar (modo privado) sigue funcionando y lo dice', () => {
    const roto: Almacenamiento = { getItem: () => null, setItem: () => { throw new Error('lleno'); } };
    const gestor = crearGestor({ almacenamiento: roto, fuente: { agregar() {}, actualizar() {}, quitar() {} }, asientos, inicial: base });
    gestor.crear({ nombre: 'Sin guardar', asientoId: libre().id, genero: 'f', variante: 0 });
    expect(gestor.guardadoCorrecto()).toBe(false);
  });
  it('si el navegador bloquea el guardado desde el principio, lo dice enseguida', () => {
    const memoria: Almacenamiento = { getItem: () => null, setItem: () => {} };
    const g = crearGestor({ almacenamiento: memoria, fuente: { agregar() {}, actualizar() {}, quitar() {} }, asientos, inicial: base, guardadoInicial: false });
    expect(g.guardadoCorrecto()).toBe(false);
  });
});

describe('gestor: sincronizar con otra pestaña', () => {
  it('añade, cambia y quita lo que difiere de la lista nueva, avisando al simulador y sin volver a guardar', () => {
    const { gestor, llamadas, d } = entorno();
    const sinCae = base.filter((a) => a.departamento !== 'cae');
    const cambiado = { ...sinCae[0]!, nombre: 'Renombrado' };
    const nuevoAgente: Agente = { ...base[0]!, id: 'extra-1', nombre: 'De otra pestaña', asientoId: libre().id };
    gestor.sincronizar([cambiado, ...sinCae.slice(1), nuevoAgente]);
    expect(llamadas).toContain('quitar:cae-1');
    expect(llamadas).toContain(`actualizar:${cambiado.id}`);
    expect(llamadas).toContain('agregar:extra-1');
    expect(gestor.agentes().map((a) => a.id)).toContain('extra-1');
    expect(gestor.agentes().some((a) => a.id === 'cae-1')).toBe(false);
    expect(d[CLAVE_AGENTES]).toBeUndefined();
  });
  it('si la lista nueva es igual, no hace nada', () => {
    const { gestor, llamadas } = entorno();
    gestor.sincronizar(base);
    expect(llamadas).toEqual([]);
  });
  it('lo siguiente que se crea en esta pestaña parte de la lista sincronizada (no pisa lo de la otra)', () => {
    const { gestor, alm } = entorno();
    const deOtra: Agente = { ...base[0]!, id: 'extra-1', nombre: 'De otra pestaña', asientoId: libre().id };
    gestor.sincronizar([...base, deOtra]);
    gestor.crear({ nombre: 'Mía', asientoId: puestosLibres(asientos, [...base, deOtra])[0]!.id, genero: 'f', variante: 0 });
    const guardados = cargarAgentes(alm, [], asientos).map((a) => a.nombre);
    expect(guardados).toContain('De otra pestaña');
    expect(guardados).toContain('Mía');
  });
});

