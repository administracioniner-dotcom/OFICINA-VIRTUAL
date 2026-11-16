import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { crearAgentes, type Agente } from '../domain/agentes';
import { cargarPlano } from '../domain/plano';
import { asientosDelPlano } from '../game/asientos';
import { CLAVE_AGENTES, cargarAgentes, guardarAgentes, type Almacenamiento } from './persistencia';

const asientos = asientosDelPlano(cargarPlano(datos));
const porDefecto = crearAgentes(asientos);
const memoria = (): Almacenamiento & { d: Record<string, string> } => {
  const d: Record<string, string> = {};
  return { d, getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; } };
};

describe('persistencia del origen', () => {
  it('un agente real se guarda y vuelve como real, esperando', () => {
    const alm = memoria();
    const real: Agente = { ...porDefecto[0]!, origen: 'real', estado: 'error' };
    guardarAgentes(alm, [real, ...porDefecto.slice(1, 3)]);
    const leida = cargarAgentes(alm, porDefecto, asientos);
    expect(leida[0]).toMatchObject({ id: real.id, origen: 'real', estado: 'esperando' });
    expect(leida[1]!.origen).toBe('simulado');
  });
  it('lo guardado antes de existir el origen (sin el campo) se carga como simulado', () => {
    const alm = memoria();
    const { origen: _o, ...viejo } = porDefecto[0]!;
    alm.d[CLAVE_AGENTES] = JSON.stringify({ version: 1, agentes: [viejo] });
    expect(cargarAgentes(alm, porDefecto, asientos)[0]).toMatchObject({ origen: 'simulado', estado: 'trabajando' });
  });
  it('un origen raro se trata como simulado', () => {
    const alm = memoria();
    alm.d[CLAVE_AGENTES] = JSON.stringify({ version: 1, agentes: [{ ...porDefecto[0]!, origen: 'hackeado' }] });
    expect(cargarAgentes(alm, porDefecto, asientos)[0]!.origen).toBe('simulado');
  });
});
