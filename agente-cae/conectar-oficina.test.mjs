import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configuracionHooks as deServidor } from '../src/puente/servidor.ts';
import { combinar, configuracionHooks, escribirConfiguracion } from './conectar-oficina.mjs';

const RUTA = 'C:\\Oficina\\puente\\hook.mjs';

describe('configuración de hooks del agente CAE', () => {
  it('es idéntica a la que da el servidor de la oficina («Conectar a Claude Code»)', () => {
    expect(configuracionHooks(RUTA, 'Agente CAE', 5173)).toEqual(deServidor(RUTA, 'Agente CAE', 5173));
  });
  it('lleva el nombre del agente, el puerto y la ruta del hook como argumentos separados (sin comillas)', () => {
    const h = configuracionHooks(RUTA, 'Agente CAE', 5173).hooks.Stop[0].hooks[0];
    expect(h.command).toBe('node');
    expect(h.args).toEqual([RUTA, '--agente', 'Agente CAE', '--puerto', '5173']);
  });
});

describe('combinar con una configuración que ya existe', () => {
  it('conserva el resto de ajustes y de hooks, y no duplica los de la oficina al repetir', () => {
    const otra = { permissions: { allow: ['Read'] }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'otra-cosa' }] }], PreCompact: [{ hooks: [{ type: 'command', command: 'x' }] }] } };
    const una = combinar(otra, configuracionHooks(RUTA, 'Agente CAE', 5173));
    expect(una.permissions).toEqual({ allow: ['Read'] });
    expect(una.hooks.PreCompact).toHaveLength(1);
    expect(una.hooks.Stop).toHaveLength(2);
    const dos = combinar(una, configuracionHooks(RUTA, 'Agente CAE', 5173));
    expect(dos).toEqual(una);
  });
  it('al cambiar el nombre o la ruta reemplaza los hooks de la oficina anteriores', () => {
    const a = combinar({}, configuracionHooks(RUTA, 'Agente CAE', 5173));
    const b = combinar(a, configuracionHooks('D:\\otra\\puente\\hook.mjs', 'Otro nombre', 5173));
    expect(b.hooks.Stop).toHaveLength(1);
    expect(b.hooks.Stop[0].hooks[0].args[2]).toBe('Otro nombre');
  });
});

describe('escribirConfiguracion', () => {
  it('crea .claude/settings.json con los hooks y es repetible', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cae-conectar-'));
    escribirConfiguracion(dir, RUTA, 'Agente CAE', 5173);
    const f = join(dir, '.claude', 'settings.json');
    expect(existsSync(f)).toBe(true);
    const uno = readFileSync(f, 'utf8');
    escribirConfiguracion(dir, RUTA, 'Agente CAE', 5173);
    expect(readFileSync(f, 'utf8')).toBe(uno);
    expect(JSON.parse(uno).hooks.SessionStart).toBeTruthy();
  });
  it('respeta un settings.json existente', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cae-conectar-'));
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: ['Bash(rm *)'] } }));
    escribirConfiguracion(dir, RUTA, 'Agente CAE', 5173);
    const j = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    expect(j.permissions).toEqual({ deny: ['Bash(rm *)'] });
    expect(j.hooks.Stop).toHaveLength(1);
  });
  it('no escribe nada si el nombre está vacío o el puerto no es válido', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cae-conectar-'));
    expect(() => escribirConfiguracion(dir, RUTA, '  ', 5173)).toThrow(/nombre/);
    expect(() => escribirConfiguracion(dir, RUTA, 'A', 99999)).toThrow(/puerto/);
    expect(existsSync(join(dir, '.claude'))).toBe(false);
  });
  it('si settings.json existe pero está roto, no lo pisa: da error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cae-conectar-'));
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'settings.json'), '{ no es json');
    expect(() => escribirConfiguracion(dir, RUTA, 'A', 5173)).toThrow(/settings\.json/);
    expect(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8')).toBe('{ no es json');
  });
});
