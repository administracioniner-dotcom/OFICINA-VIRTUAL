import Phaser from 'phaser';
import { bus } from '../../state/bus';
import { esArrastre, limitarCamara, zoomAjustar, zoomParaRect, zoomSiguiente, zoomTrasRedimensionar, type Punto, type Tam } from './zoom';

export interface RectMundo { x: number; y: number; ancho: number; alto: number }
export interface ControlCamara {
  /** Encuadra todo el mapa (zoom mínimo, centrado). */
  ajustar(): void;
  /** Anima la cámara hasta ver el rectángulo (en píxeles del mapa). */
  irA(rect: RectMundo): void;
}

const VELOCIDAD_TECLADO = 320; // píxeles del mapa por segundo con zoom 1
const MUESCA_RUEDA = 40;

export function instalarControles(escena: Phaser.Scene, mapa: Tam): ControlCamara {
  const cam = escena.cameras.main;
  let zoom = 1;
  let minimo = 0.1;
  let centro: Punto = { x: mapa.ancho / 2, y: mapa.alto / 2 };
  let animacion: Phaser.Tweens.Tween | undefined;

  const vista = (): Tam => ({ ancho: cam.width, alto: cam.height });
  const aplicar = () => {
    centro = limitarCamara(centro, zoom, vista(), mapa);
    cam.setZoom(zoom);
    cam.centerOn(centro.x, centro.y);
  };
  const recalcularMinimo = () => {
    minimo = zoomAjustar(vista(), mapa);
    if (zoom < minimo) zoom = minimo;
  };
  const parar = () => { animacion?.stop(); animacion = undefined; };

  const cambiarZoom = (direccion: 1 | -1, ancla?: Punto) => {
    parar();
    const nuevo = zoomSiguiente(zoom, direccion, minimo);
    if (nuevo === zoom) return;
    const v = vista();
    const a = ancla ?? { x: v.ancho / 2, y: v.alto / 2 };
    const mundo = { x: centro.x + (a.x - v.ancho / 2) / zoom, y: centro.y + (a.y - v.alto / 2) / zoom };
    centro = { x: mundo.x - (a.x - v.ancho / 2) / nuevo, y: mundo.y - (a.y - v.alto / 2) / nuevo };
    zoom = nuevo;
    aplicar();
    bus.emit('camara:zoom', zoom);
  };

  // Arrastrar: botón izquierdo con umbral de 5 px; botón central sin umbral
  let inicio: { x: number; y: number; cx: number; cy: number } | null = null;
  let arrastrando = false;
  escena.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if (p.button !== 0 && p.button !== 1) return;
    parar();
    inicio = { x: p.x, y: p.y, cx: centro.x, cy: centro.y };
    arrastrando = p.button === 1;
  });
  escena.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!inicio || !p.isDown) return;
    const dx = p.x - inicio.x, dy = p.y - inicio.y;
    if (!arrastrando && esArrastre(dx, dy)) arrastrando = true;
    if (!arrastrando) return;
    centro = { x: inicio.cx - dx / zoom, y: inicio.cy - dy / zoom };
    aplicar();
  });
  const soltar = () => { inicio = null; arrastrando = false; };
  escena.input.on('pointerup', soltar);
  escena.input.on('pointerupoutside', soltar);

  // Rueda: un paso de zoom por muesca, anclado al cursor
  let acumulado = 0;
  escena.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    acumulado += dy;
    if (Math.abs(acumulado) < MUESCA_RUEDA) return;
    const direccion = acumulado < 0 ? 1 : -1;
    acumulado = 0;
    cambiarZoom(direccion, { x: p.x, y: p.y });
  });

  // Teclado: WASD y flechas
  const teclas = escena.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as
    Record<string, Phaser.Input.Keyboard.Key> | undefined;
  escena.events.on('update', (_t: number, dt: number) => {
    if (!teclas) return;
    const dx = (teclas.D!.isDown || teclas.RIGHT!.isDown ? 1 : 0) - (teclas.A!.isDown || teclas.LEFT!.isDown ? 1 : 0);
    const dy = (teclas.S!.isDown || teclas.DOWN!.isDown ? 1 : 0) - (teclas.W!.isDown || teclas.UP!.isDown ? 1 : 0);
    if (!dx && !dy) return;
    parar();
    const paso = (VELOCIDAD_TECLADO / zoom) * (dt / 1000);
    centro = { x: centro.x + dx * paso, y: centro.y + dy * paso };
    aplicar();
  });

  escena.scale.on('resize', () => {
    const anterior = minimo;
    minimo = zoomAjustar(vista(), mapa);
    zoom = zoomTrasRedimensionar(zoom, anterior, minimo);
    aplicar();
    bus.emit('camara:zoom', zoom);
  });
  const quitarZoom = bus.on('zoom:cambiar', (d) => cambiarZoom(d));
  escena.events.once('shutdown', quitarZoom);
  escena.events.once('destroy', quitarZoom);

  recalcularMinimo();
  return {
    ajustar() {
      parar();
      recalcularMinimo();
      zoom = minimo;
      centro = { x: mapa.ancho / 2, y: mapa.alto / 2 };
      aplicar();
      bus.emit('camara:zoom', zoom);
    },
    irA(rect) {
      parar();
      recalcularMinimo();
      const destZoom = zoomParaRect(vista(), rect, minimo);
      const destino = limitarCamara({ x: rect.x + rect.ancho / 2, y: rect.y + rect.alto / 2 }, destZoom, vista(), mapa);
      const est = { z: zoom, x: centro.x, y: centro.y };
      animacion = escena.tweens.add({
        targets: est, z: destZoom, x: destino.x, y: destino.y, duration: 400, ease: 'Cubic.easeInOut',
        onUpdate: () => { zoom = est.z; centro = { x: est.x, y: est.y }; aplicar(); },
        onComplete: () => { zoom = destZoom; centro = destino; aplicar(); bus.emit('camara:zoom', zoom); },
      });
    },
  };
}
