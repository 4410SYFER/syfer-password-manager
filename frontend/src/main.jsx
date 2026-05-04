// Entry point for the React app
// Mounts the root App component into the #root div in index.html

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode highlights potential problems during development
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
