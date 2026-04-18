import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeckRu from './PitchDeckRu';
import './index.css';
import './pitch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeckRu />
  </StrictMode>,
);
