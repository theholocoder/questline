import '@questline/ui/tokens.css';
import './global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Workbench } from './Workbench';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <Workbench />
  </StrictMode>,
);
