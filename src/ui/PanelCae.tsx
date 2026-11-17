import { useEffect, useState } from 'react';
import type { ResumenCae } from '../puente/cae';

const fecha = (f: string | null) => (f ? f.split('-').reverse().join('/') : '—');
const REFRESCO_MS = 30_000;

/** Datos reales de la base de conocimiento del agente CAE (solo recuentos), leídos de la carpeta agente-cae por el servidor local. */
export function PanelCae() {
  const [r, setR] = useState<ResumenCae | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const resp = await fetch('/api/oficina/cae');
        if (!resp.ok) throw new Error(String(resp.status));
        const datos = (await resp.json()) as ResumenCae;
        if (vivo) { setR(datos); setError(false); }
      } catch { if (vivo) setError(true); }
    };
    void cargar();
    const t = setInterval(() => void cargar(), REFRESCO_MS);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  return (
    <section className="panel-cae" aria-label="Base de conocimiento del agente CAE">
      <h3>Base de conocimiento CAE</h3>
      {error && !r && <p className="vacio">Solo disponible con la oficina abierta con <code>iniciar.bat</code>.</p>}
      {r && !r.disponible && <p className="vacio">No encuentro la carpeta <code>agente-cae</code> junto a la oficina.</p>}
      {r?.disponible && (
        <>
          <dl>
            <dt>Fichas</dt>
            <dd>{r.fichas.total} <small>({r.fichas.residencial} residenciales · {r.fichas.industrial} industriales{r.fichas.serieS ? ` · ${r.fichas.serieS} serie S` : ''})</small></dd>
            <dt>Normativa</dt>
            <dd>{r.normativa.total} <small>({r.normativa.aprobadas} aprobadas{r.normativa.enConsulta ? ` · ${r.normativa.enConsulta} en consulta` : ''}) · última publicada {fecha(r.normativa.ultimaPublicacion)}</small></dd>
            <dt>Alertas</dt>
            <dd>{r.alertas}</dd>
            <dt>Oportunidades</dt>
            <dd>{r.oportunidades.pendientes} pendientes <small>de {r.oportunidades.total}</small></dd>
            <dt>Última consulta</dt>
            <dd>{fecha(r.ultimaConsulta)}</dd>
            <dt>Último informe</dt>
            <dd>{r.ultimoInforme ? <>{fecha(r.ultimoInforme.fecha)} <small>({r.ultimoInforme.nombre})</small></> : 'ninguno todavía'}</dd>
          </dl>
          {r.alertasRecientes.length > 0 && (
            <ul className="alertas-cae" aria-label="Alertas recientes">
              {r.alertasRecientes.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          {r.problemas.length > 0 && <p className="errores" role="alert">No se pudo leer: {r.problemas.join(', ')}</p>}
        </>
      )}
    </section>
  );
}
