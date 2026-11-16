import { useEffect, useState } from 'react';
import { bus } from '../state/bus';

export function Zoom() {
  const [nivel, setNivel] = useState(1);
  useEffect(() => bus.on('camara:zoom', setNivel), []);
  return (
    <div className="panel zoom" role="group" aria-label="Zoom">
      <button type="button" className="boton" aria-label="Alejar" onClick={() => bus.emit('zoom:cambiar', -1)}>−</button>
      <span className="nivel" aria-live="polite">{nivel.toFixed(nivel % 1 ? 1 : 0).replace('.', ',')}×</span>
      <button type="button" className="boton" aria-label="Acercar" onClick={() => bus.emit('zoom:cambiar', 1)}>+</button>
    </div>
  );
}
