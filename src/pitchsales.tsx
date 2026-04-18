import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeckSales from './PitchDeckSales';
import './index.css';
import './pitch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeckSales />
  </StrictMode>,
);
