/** Lo mínimo que se mira de un elemento del documento (así se prueba sin navegador). */
export interface ElementoEnfocado { tagName?: string; type?: string; isContentEditable?: boolean }

const TIPOS_SIN_TEXTO = new Set(['radio', 'checkbox', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** ¿Está la persona escribiendo (campo de texto, lista, área o elemento editable)? Entonces WASD y las flechas son para escribir, no para la cámara. */
export function esCampoDeTexto(el: ElementoEnfocado | null | undefined): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !TIPOS_SIN_TEXTO.has((el.type ?? 'text').toLowerCase());
  return false;
}
