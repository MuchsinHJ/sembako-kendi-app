import React from 'react';
import ReactDOM from 'react-dom/client';
import RootProviders from './RootProviders';
import './theme/tokens.css';

// SDD FE §4.1: mount pakai ReactDOM.createRoot.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootProviders />
  </React.StrictMode>
);
