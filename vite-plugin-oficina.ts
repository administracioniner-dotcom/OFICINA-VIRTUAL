import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { crearNucleo } from './src/puente/nucleo';
import { asegurarClave, crearManejador } from './src/puente/servidor';

/** Monta el puente de Claude Code en el servidor local de Vite (desarrollo y vista previa). Solo en este ordenador. */
export function oficinaPuente(): Plugin {
  const puente = crearNucleo();
  let raiz = process.cwd();
  const montar = (puerto: number) => crearManejador({
    clave: asegurarClave(resolve(raiz, '.oficina')),
    puerto,
    puente,
    rutaHook: resolve(raiz, 'puente', 'hook.mjs'),
  });
  return {
    name: 'oficina-puente',
    configResolved(c) { raiz = c.root; },
    configureServer(s) { s.middlewares.use(montar(s.config.server.port)); },
    configurePreviewServer(s) { s.middlewares.use(montar(s.config.preview.port)); },
  };
}
