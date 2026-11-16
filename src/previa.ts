// Herramienta de desarrollo: dibuja los personajes y los globos para revisarlos. No forma parte de la aplicación.
import { aspecto, dibujarPersonaje, ANCHO_FOTOGRAMA, ALTO_FOTOGRAMA, type Direccion } from './game/sprites/personaje';
import { COLOR_ESTADO, dibujarGlobo, type EstadoAgente } from './game/sprites/globos';

const DEPTOS: Array<[string, string]> = [
  ['Dirección 1', '#3d4452'], ['Dirección 2', '#3d4452'], ['Ingeniería 1', '#f57c00'], ['Ingeniería 2', '#f57c00'],
  ['Compras', '#8d6e63'], ['Recepción', '#e5a800'], ['Desarrollo', '#d6403a'], ['Marketing', '#e84a9a'], ['CAE', '#00897b'], ['Administración', '#5c6bc0'],
];
const ESC = 4, MARGEN = 10;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const W = 12 * ANCHO_FOTOGRAMA + 2 * MARGEN, H = 190;
canvas.width = W; canvas.height = H;
canvas.style.width = `${W * ESC}px`; canvas.style.height = `${H * ESC}px`;
const c = canvas.getContext('2d')!;
c.imageSmoothingEnabled = false;
c.fillStyle = '#a6d548'; c.fillRect(0, 0, W, H);

// Fila 1: los 10 agentes mirando al frente, con globo de estado
const estados: EstadoAgente[] = ['trabajando', 'pensando', 'esperando', 'en_reunion', 'completada', 'error', 'trabajando', 'pensando', 'esperando', 'trabajando'];
DEPTOS.forEach(([, camisa], i) => {
  const x = MARGEN + i * (ANCHO_FOTOGRAMA + 3), y = 22;
  dibujarGlobo(c, x + 4, 2, estados[i]!);
  dibujarPersonaje(c, x, y, aspecto(camisa, i), 'sur', 0);
});

// Fila 2: ciclo de caminar (4 direcciones × 4 fotogramas) de dos agentes
(['sur', 'norte', 'este', 'oeste'] as Direccion[]).forEach((dir, d) => {
  for (let f = 0; f < 4; f++) dibujarPersonaje(c, MARGEN + d * 4 * 25 + f * 25 + (d > 1 ? 0 : 0), 62, aspecto('#f57c00', 2), dir, f);
});
// Fila 3: sentados (pose de trabajo)
for (let i = 0; i < 6; i++) dibujarPersonaje(c, MARGEN + i * 25, 100, aspecto(DEPTOS[i * 1 % 10]![1], i + 1), 'sur', i % 2, true);
// Fila 4: los seis estados
(['trabajando', 'pensando', 'esperando', 'en_reunion', 'completada', 'error'] as EstadoAgente[]).forEach((e, i) => {
  dibujarGlobo(c, MARGEN + 170 + i * 20, 104, e);
  c.fillStyle = COLOR_ESTADO[e]; c.fillRect(MARGEN + 170 + i * 20 + 4, 122, 8, 2);
});
