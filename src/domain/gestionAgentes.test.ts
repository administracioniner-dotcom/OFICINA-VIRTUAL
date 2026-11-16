import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { asientosDelPlano } from '../game/asientos';
import { crearAgentes, type Agente } from './agentes';
import { construirAgente, puestosLibres, validarDatosAgente } from './gestionAgentes';
import { cargarPlano } from './plano';

const asientos = asientosDelPlano(cargarPlano(datos));
const agentes = crearAgentes(asientos);

describe('puestosLibres', () => {
  it('quedan 5 puestos de trabajo libres: el 2.º escritorio de Dirección y los 4 de la mesa de Ingeniería', () => {
    const libres = puestosLibres(asientos, agentes);
    expect(libres).toHaveLength(5);
    expect(libres.every((p) => p.tipo !== 'reuniones')).toBe(true);
    expect(libres.filter((p) => p.zona === 'ingenieria')).toHaveLength(4);
    expect(libres.filter((p) => p.zona === 'direccion')).toHaveLength(1);
  });
  it('al quitar un agente, su puesto vuelve a estar libre', () => {
    const sin = agentes.filter((a) => a.departamento !== 'cae');
    expect(puestosLibres(asientos, sin).some((p) => p.zona === 'cae')).toBe(true);
  });
  it('un agente que se está editando no ocupa su propio puesto', () => {
    const cae = agentes.find((a) => a.departamento === 'cae')!;
    expect(puestosLibres(asientos, agentes, cae.id).some((p) => p.id === cae.asientoId)).toBe(true);
  });
});

describe('validarDatosAgente', () => {
  const libres = puestosLibres(asientos, agentes);
  const ok = { nombre: 'Lucía', asientoId: libres[0]!.id, genero: 'f' as const, variante: 2 };
  it('acepta datos correctos', () => {
    expect(validarDatosAgente(ok, asientos, agentes)).toEqual([]);
  });
  it('el nombre es obligatorio y como mucho de 40 caracteres', () => {
    expect(validarDatosAgente({ ...ok, nombre: '   ' }, asientos, agentes).join(' ')).toMatch(/nombre/i);
    expect(validarDatosAgente({ ...ok, nombre: 'x'.repeat(41) }, asientos, agentes).join(' ')).toMatch(/40/);
  });
  it('no deja repetir el nombre de otro agente (sin distinguir mayúsculas)', () => {
    const otro = agentes[0]!.nombre.toUpperCase();
    expect(validarDatosAgente({ ...ok, nombre: otro }, asientos, agentes).join(' ')).toMatch(/ya existe/i);
  });
  it('el puesto debe existir, estar libre y no ser una silla de reuniones', () => {
    expect(validarDatosAgente({ ...ok, asientoId: 'no-existe' }, asientos, agentes).join(' ')).toMatch(/puesto/i);
    expect(validarDatosAgente({ ...ok, asientoId: agentes[0]!.asientoId }, asientos, agentes).join(' ')).toMatch(/ocupado/i);
    const reunion = asientos.find((a) => a.tipo === 'reuniones')!;
    expect(validarDatosAgente({ ...ok, asientoId: reunion.id }, asientos, agentes).join(' ')).toMatch(/puesto/i);
  });
  it('al editar se puede conservar el propio nombre y el propio puesto', () => {
    const a = agentes[0]!;
    expect(validarDatosAgente({ nombre: a.nombre, asientoId: a.asientoId, genero: a.genero, variante: a.variante }, asientos, agentes, a.id)).toEqual([]);
  });
});

describe('construirAgente', () => {
  const libre = puestosLibres(asientos, agentes)[0]!;
  const datosOk = { nombre: '  Marta ', asientoId: libre.id, genero: 'f' as const, variante: 3 };
  it('construye el agente con el departamento del puesto, el color del departamento y un id nuevo', () => {
    const a = construirAgente(datosOk, asientos, agentes);
    expect(a.nombre).toBe('Marta');
    expect(a.departamento).toBe(libre.zona);
    expect(a.estado).toBe('trabajando');
    expect(agentes.some((x) => x.id === a.id)).toBe(false);
    expect(a.camisa).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('dos agentes nuevos seguidos no repiten id', () => {
    const a = construirAgente(datosOk, asientos, agentes);
    const b = construirAgente({ ...datosOk, nombre: 'Otra', asientoId: puestosLibres(asientos, [...agentes, a])[0]!.id }, asientos, [...agentes, a]);
    expect(a.id).not.toBe(b.id);
  });
  it('lanza un error claro si los datos no valen', () => {
    expect(() => construirAgente({ ...datosOk, nombre: '' }, asientos, agentes)).toThrowError(/nombre/i);
  });
  it('al editar conserva el id y el estado', () => {
    const a: Agente = { ...agentes[0]!, estado: 'error' };
    const e = construirAgente({ nombre: 'Nuevo nombre', asientoId: a.asientoId, genero: a.genero, variante: a.variante }, asientos, agentes, a);
    expect(e.id).toBe(a.id);
    expect(e.estado).toBe('error');
    expect(e.nombre).toBe('Nuevo nombre');
  });
});
