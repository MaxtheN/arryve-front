import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {VoiceDemoProvider} from './VoiceDemoContext';
import {clarityInit} from './clarity';
import './index.css';

clarityInit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoiceDemoProvider>
      <App />
    </VoiceDemoProvider>
  </StrictMode>,
);
