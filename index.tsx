import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Match the import casing with the file 'src/app.tsx' to resolve the TypeScript casing conflict error
import App from './src/app';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);