import { useState } from 'react';
import type { TipoZona, Zona } from '../domain/plano';
import { NOMBRE_ZONA } from '../domain/zonas';
import { bus } from '../state/bus';

const ORDEN: TipoZona[] = [
  'recepcion', 'direccion', 'compras', 'ingenieria', 'desarrollo', 'marketing', 'cae', 'admin', 'descanso', 'reuniones',
];

export function BarraZonas({ zonas }: { zonas: Zona[] }) {
  const [plegada, setPlegada] = useState(() => window.innerWidth < 700);
  const [activa, setActiva] = useState<TipoZona | null>(null);
  const presentes = ORDEN.filter((t) => zonas.some((z) => z.tipo === t));

  return (
    <nav className={`panel barra-zonas${plegada ? ' plegada' : ''}`} aria-label="Zonas de la oficina">
      <button type="button" className="boton plegar" onClick={() => setPlegada(!plegada)} aria-expanded={!plegada}
        aria-label={plegada ? 'Mostrar zonas' : 'Ocultar zonas'} title={plegada ? 'Mostrar zonas' : 'Ocultar zonas'}>
        {plegada ? 'Zonas ▾' : '▴'}
      </button>
      <div className="lista">
        {presentes.map((t) => (
          <button key={t} type="button" className={`boton${activa === t ? ' activo' : ''}`}
            onClick={() => { setActiva(t); bus.emit('zona:ir', t); }}>
            {NOMBRE_ZONA[t]}
          </button>
        ))}
      </div>
    </nav>
  );
}
