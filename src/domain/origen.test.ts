import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { asientosDelPlano } from '../game/asientos';
import { crearAgentes } from './agentes';
import { construirAgente, puestosLibres, validarDatosAgente, type DatosAgente } from './gestionAgentes';
import { cargarPlano } from './plano';

const asientos = asientosDelPlano(cargarPlano(datos));
const agentes = crearAgentes(asientos);
const libre = puestosLibres(asientos, agentes)[0]!;
const base: DatosAgente = { nombre: 'Claude de Ingeniería', asientoId: libre.id, genero: 'm', variante: 1 };

describe('origen del agente (simulado o real)', () => {
  it('sin indicar nada, el agente nuevo es simulado y empieza trabajando', () => {
    const a = construirAgente(base, asientos, agentes);
    expect(a.origen).toBe('simulado');
    expect(a.estado).toBe('trabajando');
  });
  it('un agente real nace esperando (no se inventa actividad)', () => {
    const a = construirAgente({ ...base, origen: 'real' }, asientos, agentes);
    expect(a.origen).toBe('real');
    expect(a.estado).toBe('esperando');
  });
  it('al editar sin tocar el origen se conserva', () => {
    const real = construirAgente({ ...base, origen: 'real' }, asientos, agentes);
    const editado = construirAgente({ ...base, nombre: 'Otro nombre' }, asientos, [...agentes, real], real);
    expect(editado.origen).toBe('real');
    expect(editado.estado).toBe('esperando');
  });
  it('un origen que no es ni simulado ni real no vale', () => {
    const errores = validarDatosAgente({ ...base, origen: 'otro' as never }, asientos, agentes);
    expect(errores.join(' ')).toMatch(/origen/i);
  });
});
