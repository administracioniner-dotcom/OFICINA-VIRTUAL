export type Celda = readonly [number, number];

export const TIPOS_ZONA = [
  'recepcion', 'direccion', 'cae', 'admin', 'desarrollo',
  'reuniones', 'descanso', 'ingenieria', 'compras', 'marketing',
] as const;
export type TipoZona = (typeof TIPOS_ZONA)[number];

export const TIPOS_OBJETO = [
  'escritorio', 'puerta', 'sofa', 'mesa', 'planta', 'entrada', 'nevera', 'mesapeq',
  'mesa4', 'mesasola', 'impresora', 'tele', 'agua', 'silla', 'futbolin', 'patinete',
  'bici', 'microondas',
] as const;
export type TipoObjeto = (typeof TIPOS_OBJETO)[number];

export type Giro = 0 | 90 | 180 | 270;

export interface Zona { tipo: TipoZona; x: number; y: number; ancho: number; alto: number }
export interface Objeto {
  tipo: TipoObjeto; x: number; y: number; ancho: number; alto: number; giro: Giro; sobre?: TipoObjeto;
}
export interface Plano {
  ancho: number; alto: number;
  zonas: Zona[]; objetos: Objeto[];
  muros: Celda[]; mamparas: Celda[]; ventanas: Celda[]; estanterias: Celda[];
}

export class PlanoInvalido extends Error {
  constructor(mensaje: string) {
    super(`Plano inválido: ${mensaje}`);
    this.name = 'PlanoInvalido';
  }
}

type Dic = Record<string, unknown>;
const esDic = (v: unknown): v is Dic => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function lista(d: Dic, clave: string): unknown[] {
  const v = d[clave];
  if (!Array.isArray(v)) throw new PlanoInvalido(`falta la lista «${clave}»`);
  return v;
}

function celdas(d: Dic, clave: string, ancho: number, alto: number): Celda[] {
  return lista(d, clave).map((c, i) => {
    if (!Array.isArray(c) || c.length !== 2 || !esNum(c[0]) || !esNum(c[1]))
      throw new PlanoInvalido(`«${clave}» #${i} no es una pareja [x, y]`);
    if (c[0] < 0 || c[1] < 0 || c[0] >= ancho || c[1] >= alto)
      throw new PlanoInvalido(`«${clave}» #${i} (${c[0]},${c[1]}) está fuera del mapa`);
    return [c[0], c[1]] as const;
  });
}

function rect(o: Dic, etiqueta: string): { x: number; y: number; ancho: number; alto: number } {
  for (const k of ['x', 'y', 'ancho', 'alto']) {
    if (!esNum(o[k])) throw new PlanoInvalido(`${etiqueta}: falta o no es número «${k}»`);
  }
  return { x: o.x as number, y: o.y as number, ancho: o.ancho as number, alto: o.alto as number };
}

export function cargarPlano(datos: unknown): Plano {
  if (!esDic(datos)) throw new PlanoInvalido('los datos no son un objeto');
  const cuad = datos.cuadricula;
  if (!esDic(cuad) || !esNum(cuad.ancho) || !esNum(cuad.alto))
    throw new PlanoInvalido('falta «cuadricula» con ancho y alto');
  const { ancho, alto } = cuad as { ancho: number; alto: number };
  const dentro = (r: { x: number; y: number; ancho: number; alto: number }) =>
    r.x >= 0 && r.y >= 0 && r.ancho > 0 && r.alto > 0 && r.x + r.ancho <= ancho && r.y + r.alto <= alto;

  const zonas = lista(datos, 'zonas').map((z, i): Zona => {
    if (!esDic(z)) throw new PlanoInvalido(`zona #${i} no es un objeto`);
    if (!(TIPOS_ZONA as readonly unknown[]).includes(z.tipo)) throw new PlanoInvalido(`zona #${i}: tipo desconocido «${String(z.tipo)}»`);
    const r = rect(z, `zona ${String(z.tipo)}`);
    if (!dentro(r)) throw new PlanoInvalido(`la zona ${String(z.tipo)} está fuera del mapa`);
    return { tipo: z.tipo as TipoZona, ...r };
  });

  const objetos = lista(datos, 'objetos').map((o, i): Objeto => {
    if (!esDic(o)) throw new PlanoInvalido(`objeto #${i} no es un objeto`);
    if (!(TIPOS_OBJETO as readonly unknown[]).includes(o.tipo)) throw new PlanoInvalido(`objeto #${i}: tipo desconocido «${String(o.tipo)}»`);
    const r = rect(o, `objeto ${String(o.tipo)}`);
    if (!dentro(r)) throw new PlanoInvalido(`el objeto ${String(o.tipo)} en (${r.x},${r.y}) está fuera del mapa`);
    if (![0, 90, 180, 270].includes(o.giro as number)) throw new PlanoInvalido(`objeto ${String(o.tipo)}: giro no válido «${String(o.giro)}»`);
    if (o.sobre !== undefined && !(TIPOS_OBJETO as readonly unknown[]).includes(o.sobre))
      throw new PlanoInvalido(`objeto ${String(o.tipo)}: «sobre» desconocido «${String(o.sobre)}»`);
    const res: Objeto = { tipo: o.tipo as TipoObjeto, ...r, giro: o.giro as Giro };
    if (o.sobre !== undefined) res.sobre = o.sobre as TipoObjeto;
    return res;
  });

  return {
    ancho, alto, zonas, objetos,
    muros: celdas(datos, 'muros', ancho, alto),
    mamparas: celdas(datos, 'mamparas', ancho, alto),
    ventanas: celdas(datos, 'ventanas', ancho, alto),
    estanterias: celdas(datos, 'estanterias_celdas', ancho, alto),
  };
}

const TRANSITABLES: readonly TipoObjeto[] = ['puerta', 'entrada', 'silla'];

export function rejillaBloqueada(p: Plano): boolean[][] {
  const r = Array.from({ length: p.alto }, () => Array<boolean>(p.ancho).fill(false));
  for (const lista of [p.muros, p.mamparas, p.ventanas, p.estanterias]) {
    for (const [x, y] of lista) r[y]![x] = true;
  }
  for (const o of p.objetos) {
    if (o.sobre || TRANSITABLES.includes(o.tipo)) continue;
    for (let j = 0; j < o.alto; j++) for (let i = 0; i < o.ancho; i++) r[o.y + j]![o.x + i] = true;
  }
  for (const o of p.objetos) {
    if (o.tipo !== 'entrada') continue;
    for (let j = 0; j < o.alto; j++) for (let i = 0; i < o.ancho; i++) r[o.y + j]![o.x + i] = false;
  }
  return r;
}

export function celdasAlcanzables(p: Plano): boolean[][] {
  const bloq = rejillaBloqueada(p);
  const vis = Array.from({ length: p.alto }, () => Array<boolean>(p.ancho).fill(false));
  const cola: Array<[number, number]> = [];
  for (const o of p.objetos) {
    if (o.tipo !== 'entrada') continue;
    for (let j = 0; j < o.alto; j++) {
      for (let i = 0; i < o.ancho; i++) {
        const x = o.x + i, y = o.y + j;
        if (!vis[y]![x]) { vis[y]![x] = true; cola.push([x, y]); }
      }
    }
  }
  while (cola.length) {
    const [x, y] = cola.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= p.ancho || ny >= p.alto) continue;
      if (bloq[ny]![nx] || vis[ny]![nx]) continue;
      vis[ny]![nx] = true;
      cola.push([nx, ny]);
    }
  }
  return vis;
}

export function zonaEn(p: Plano, x: number, y: number): Zona | undefined {
  let res: Zona | undefined;
  for (const z of p.zonas) {
    if (x >= z.x && x < z.x + z.ancho && y >= z.y && y < z.y + z.alto) res = z;
  }
  return res;
}
