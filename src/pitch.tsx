import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeck from './PitchDeck';
import './index.css';
import './pitch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeck />
  </StrictMode>,
);
