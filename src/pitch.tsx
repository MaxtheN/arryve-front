import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PitchDeck from './PitchDeck';
import { clarityInit } from './clarity';
import { metaInit } from './meta-pixel';
import { gtagInit } from './gtag';
import './index.css';
import './pitch.css';

clarityInit();
metaInit();
gtagInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PitchDeck />
  </StrictMode>,
);
