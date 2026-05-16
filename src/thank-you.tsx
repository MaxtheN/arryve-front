import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ThankYou from './ThankYou';
import { clarityInit } from './clarity';
import { metaInit } from './meta-pixel';
import { gtagInit } from './gtag';
import './index.css';

clarityInit();
metaInit();
gtagInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThankYou />
  </StrictMode>,
);
