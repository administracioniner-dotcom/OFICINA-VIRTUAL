import { useState } from 'react';

interface Respuesta { configuracion: unknown; ruta: string }

/** Enseña la configuración de hooks lista para pegar en Claude Code, para este agente. Nada se envía fuera de este ordenador. */
export function ConectarClaudeCode({ nombre }: { nombre: string }) {
  const [estado, setEstado] = useState<'cerrado' | 'cargando' | 'listo' | 'error'>('cerrado');
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [copiado, setCopiado] = useState(false);

  const abrir = async () => {
    setEstado('cargando'); setCopiado(false);
    try {
      const r = await fetch(`/api/oficina/configuracion?agente=${encodeURIComponent(nombre)}`);
      if (!r.ok) throw new Error(String(r.status));
      setDatos((await r.json()) as Respuesta);
      setEstado('listo');
    } catch { setEstado('error'); }
  };
  const texto = datos ? JSON.stringify(datos.configuracion, null, 2) : '';
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); } catch { setCopiado(false); }
  };

  return (
    <section className="conectar" aria-label="Conectar a Claude Code">
      {estado === 'cerrado' && <button type="button" className="boton" onClick={abrir}>Conectar a Claude Code</button>}
      {estado === 'cargando' && <p className="vacio">Preparando la configuración…</p>}
      {estado === 'error' && (
        <p className="errores" role="alert">No se pudo preparar. Abre la oficina con <code>iniciar.bat</code> (el puente va dentro del servidor local). <button type="button" className="boton" onClick={abrir}>Reintentar</button></p>
      )}
      {estado === 'listo' && (
        <>
          <ol className="pasos">
            <li>Abre (o crea) el fichero <code>.claude/settings.json</code> del proyecto donde trabaja este Claude Code, o <code>~/.claude/settings.json</code> para todos.</li>
            <li>Pega esto dentro (si ya tiene un apartado <code>hooks</code>, une los eventos).</li>
            <li>Reinicia ese Claude Code. Su agente pasará a «En directo» al primer aviso.</li>
          </ol>
          <pre tabIndex={0} aria-label="Configuración de hooks">{texto}</pre>
          <div className="acciones">
            <button type="button" className="boton principal" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
            <button type="button" className="boton" onClick={() => setEstado('cerrado')}>Cerrar</button>
          </div>
          <p className="aviso">El nombre del agente en la oficina debe coincidir con el de este aviso: «{nombre}». Solo se envían estado, herramienta usada (primera palabra del comando o nombre del fichero) y la orden recortada a 80 caracteres, y solo a este ordenador.</p>
        </>
      )}
    </section>
  );
}
