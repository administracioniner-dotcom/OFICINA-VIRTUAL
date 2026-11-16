import Phaser from 'phaser';
import type { Agente, EstadoAgente } from '../domain/agentes';
import type { Celda } from '../domain/plano';
import { avanzarPuntos, buscarRuta, type EstadoMovimiento, type Punto } from '../domain/rutas';
import type { Asiento } from './asientos';
import { TILE } from './paleta';
import { claveGlobo, claveHoja } from './sprites/hojas';
import type { Direccion } from './sprites/personaje';

/** Velocidad al caminar: unas 3 baldosas por segundo. */
const VELOCIDAD = 3 * TILE;
/** Pies del sprite: el fotograma mide 24 × 32 y los pies están en y = 29. */
const PIES = 29;
/** Desplazamiento entre el centro de la silla y los pies del sprite al estar sentado. */
const SENTADO_DY = 12;

type Modo = 'sentado' | 'caminando';

/** Un agente en pantalla: se sienta, se levanta y camina por la rejilla. */
export class Actor {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly globo: Phaser.GameObjects.Image;
  private modo: Modo = 'sentado';
  private asiento: Asiento;
  private estado: EstadoAgente;
  private dir: Direccion;
  private puntos: Punto[] = [];
  private mov: EstadoMovimiento = { x: 0, y: 0, indice: 0 };
  private destino: Asiento | null = null;
  private t = 0;

  constructor(
    escena: Phaser.Scene,
    readonly agente: Agente,
    private readonly asientos: ReadonlyMap<string, Asiento>,
    private readonly bloqueada: readonly (readonly boolean[])[],
  ) {
    this.asiento = asientos.get(agente.asientoId)!;
    this.estado = agente.estado;
    this.dir = this.asiento.mira;
    this.sprite = escena.add.image(0, 0, claveHoja(agente.id), `${this.dir}-s0`).setOrigin(0.5, PIES / 32);
    this.globo = escena.add.image(0, 0, claveGlobo(this.estado)).setOrigin(0.5, 1).setScale(1.5);
    this.sentarEn(this.asiento);
  }

  get posicion(): Punto { return { x: this.sprite.x, y: this.sprite.y }; }
  get estaSentado(): boolean { return this.modo === 'sentado'; }
  get asientoActual(): Asiento { return this.asiento; }

  setEstado(e: EstadoAgente): void {
    this.estado = e;
    this.globo.setTexture(claveGlobo(e));
  }

  /** Va caminando hasta un asiento (levantándose del actual si hace falta). */
  irA(id: string): void {
    const dest = this.asientos.get(id);
    if (!dest || (this.modo === 'sentado' && dest.id === this.asiento.id)) return;
    // todos los puntos son «dónde tiene los pies»
    const inicio: Punto = this.modo === 'sentado' ? { x: this.asiento.x, y: this.asiento.y + SENTADO_DY } : this.posicion;
    const celdaInicio: Celda = this.modo === 'sentado'
      ? this.asiento.acceso
      : [Math.min(Math.max(Math.floor(inicio.x / TILE), 0), this.bloqueada[0]!.length - 1), Math.min(Math.max(Math.floor(inicio.y / TILE), 0), this.bloqueada.length - 1)];
    const ruta = buscarRuta(this.bloqueada, celdaInicio, dest.acceso);
    if (!ruta) return;
    const centro = ([cx, cy]: Celda): Punto => ({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2 });
    this.puntos = [inicio, ...ruta.map(centro), { x: dest.x, y: dest.y + SENTADO_DY }];
    this.mov = { x: inicio.x, y: inicio.y, indice: 1 };
    this.destino = dest;
    this.modo = 'caminando';
  }

  actualizar(dt: number): void {
    this.t += dt;
    if (this.modo === 'caminando') this.caminar(dt);
    else this.teclear();
    // el globo siempre encima de la cabeza, con un pequeño vaivén
    const bob = Math.round(Math.sin(this.t * 3) * 1);
    this.globo.setPosition(this.sprite.x, this.sprite.y - PIES - 2 + bob).setDepth(100000 + this.sprite.y);
  }

  private caminar(dt: number): void {
    const paso = avanzarPuntos(this.mov, this.puntos, dt, VELOCIDAD);
    this.mov = paso.estado;
    if (paso.dir) this.dir = paso.dir;
    if (paso.terminado && this.destino) { this.sentarEn(this.destino); return; }
    this.sprite.setPosition(this.mov.x, this.mov.y);
    const f = Math.floor(this.t / 0.14) % 4;
    this.sprite.setFrame(`${this.dir}-c${f}`);
    this.sprite.setDepth(this.mov.y);
  }

  private sentarEn(a: Asiento): void {
    this.asiento = a;
    this.destino = null;
    this.modo = 'sentado';
    this.dir = a.mira;
    this.sprite.setPosition(a.x, a.y + SENTADO_DY);
    this.sprite.setFrame(`${a.mira}-s0`);
    // detrás de la mesa si está al norte; delante si está al sur o a un lado
    this.sprite.setDepth(a.lado === 'norte' ? a.fondo - 0.5 : a.fondo + 0.5);
  }

  private teclear(): void {
    const f = this.estado === 'trabajando' ? Math.floor(this.t / 0.35) % 2 : 0;
    this.sprite.setFrame(`${this.dir}-s${f}`);
  }
}
