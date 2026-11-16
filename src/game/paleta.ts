/** Píxeles por baldosa. Se dibuja a 32 px para tener más detalle en cada objeto. */
export const TILE = 32;

export const PALETA = {
  fondo: '#1d1f24',
  // suelo verde limón, algo suavizado
  suelo: ['#a6d548', '#a0d043', '#abd94d', '#9ccd40'],
  sueloLinea: '#92c03a',
  alfombra: '#a4aab3',
  alfombraPunto: '#959ca6',
  alfombraBorde: '#7f8691',
  // muros
  muroTapa: '#5b6270',
  muroLuz: '#717989',
  muroFrente: '#363b46',
  muroSombra: '#2a2e37',
  // mobiliario
  blanco: '#f4f5f7',
  blancoSombra: '#d3d7dd',
  borde: '#8b93a1',
  contorno: '#2a2e37',
  pantalla: '#2b3038',
  pantallaLuz: '#5b7fa3',
  madera: '#b98a5a',
  maderaOscura: '#7a5532',
  // colores corporativos y sillas
  naranja: '#f57c00',
  naranjaOscuro: '#b85a00',
  naranjaClaro: '#ffa040',
  rojo: '#d6403a',
  rojoOscuro: '#9f2a26',
  gris: '#808897',
  grisOscuro: '#565d69',
  verde: '#3fae5a',
  verdeOscuro: '#2a7a3e',
  azul: '#3b6ea5',
  cristal: '#bfe6f5',
  cristalOscuro: '#7fb8d1',
} as const;
