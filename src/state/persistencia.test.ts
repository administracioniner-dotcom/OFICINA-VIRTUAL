import { describe, expect, it } from 'vitest';
import datos from '../../data/plano-v1.json';
import { crearAgentes, type Agente } from '../domain/agentes';
import { cargarPlano } from '../domain/plano';
import { asientosDelPlano } from '../game/asientos';
import { CLAVE_AGENTES, cargarAgentes, guardarAgentes, type Almacenamiento } from './persistencia';

const asientos = asientosDelPlano(cargarPlano(datos));
const porDefecto = crearAgentes(asientos);

function memoria(inicial: Record<string, string> = {}): Almacenamiento & { datos: Record<string, string> } {
  const d = { ...inicial };
  return { datos: d, getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; } };
}

describe('persistencia de agentes', () => {
  it('sin nada guardado devuelve los agentes por defecto', () => {
    expect(cargarAgentes(memoria(), porDefecto, asientos)).toEqual(porDefecto);
  });
  it('guarda y recupera la lista (el estado vuelve a «trabajando»)', () => {
    const alm = memoria();
    const lista: Agente[] = porDefecto.slice(0, 3).map((a) => ({ ...a, estado: 'error' as const }));
    expect(guardarAgentes(alm, lista)).toBe(true);
    const leida = cargarAgentes(alm, porDefecto, asientos);
    expect(leida.map((a) => a.id)).toEqual(lista.map((a) => a.id));
    expect(leida.every((a) => a.estado === 'trabajando')).toBe(true);
  });
  it('una lista vacía guardada es una lista vacía (el usuario quitó a todos), no los de por defecto', () => {
    const alm = memoria();
    guardarAgentes(alm, []);
    expect(cargarAgentes(alm, porDefecto, asientos)).toEqual([]);
  });
  it('datos corruptos: vuelve a los de por defecto sin romper', () => {
    expect(cargarAgentes(memoria({ [CLAVE_AGENTES]: '{no es json' }), porDefecto, asientos)).toEqual(porDefecto);
    expect(cargarAgentes(memoria({ [CLAVE_AGENTES]: '{"a":1}' }), porDefecto, asientos)).toEqual(porDefecto);
  });
  it('descarta los agentes inválidos: puesto inexistente, de reuniones, repetido o con campos mal', () => {
    const reunion = asientos.find((a) => a.tipo === 'reuniones')!;
    const buenos = porDefecto.slice(0, 2);
    const raros = [
      { ...buenos[0]!, id: 'x1', asientoId: 'no-existe' },
      { ...buenos[0]!, id: 'x2', asientoId: reunion.id },
      { ...buenos[0]!, id: 'x3' },                 // mismo puesto que buenos[0]
      { ...buenos[1]!, id: 'x4', nombre: 5 },
      null, 7, 'texto',
    ];
    const alm = memoria({ [CLAVE_AGENTES]: JSON.stringify({ version: 1, agentes: [...buenos, ...raros] }) });
    expect(cargarAgentes(alm, porDefecto, asientos).map((a) => a.id)).toEqual(buenos.map((a) => a.id));
  });
  it('si el almacenamiento falla (modo privado, cuota), no lanza: guardar devuelve false y cargar usa los de por defecto', () => {
    const roto: Almacenamiento = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } };
    expect(guardarAgentes(roto, porDefecto)).toBe(false);
    expect(cargarAgentes(roto, porDefecto, asientos)).toEqual(porDefecto);
  });
});
