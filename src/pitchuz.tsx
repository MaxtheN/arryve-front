import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeckUz from './PitchDeckUz';
import './index.css';
import './pitch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeckUz />
  </StrictMode>,
);
