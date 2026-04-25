import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeckUz from './PitchDeckUz';
import { clarityInit } from './clarity';
import './index.css';
import './pitch.css';

clarityInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeckUz />
  </StrictMode>,
);
