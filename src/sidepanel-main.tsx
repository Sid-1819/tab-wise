import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidePanel } from './components/sidepanel';
import { ThemeProvider } from './components/theme-provider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="tab-wise-theme">
      <SidePanel />
    </ThemeProvider>
  </React.StrictMode>
);
