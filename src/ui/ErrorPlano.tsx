export function ErrorPlano({ mensaje }: { mensaje: string }) {
  return (
    <div role="alert" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, color: '#fff', font: '16px/1.5 system-ui, sans-serif', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#f57c00', fontSize: 20 }}>No se pudo cargar el plano de la oficina</h1>
        <p>{mensaje}</p>
      </div>
    </div>
  );
}
