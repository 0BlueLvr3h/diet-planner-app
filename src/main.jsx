import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AuthGate from './auth/AuthGate';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {({ username, onLogout }) => <App username={username} onLogout={onLogout} />}
    </AuthGate>
  </React.StrictMode>
);