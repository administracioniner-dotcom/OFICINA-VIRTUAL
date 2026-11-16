import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p';
import { App } from './ui/App';
import './ui/estilos.css';

createRoot(document.getElementById('raiz')!).render(<App />);
