import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';

// Global error handler for early initialization errors
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global error caught:", message, source, lineno, colno, error);
  // If the root is not mounted yet, we can show a basic fallback
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.innerHTML === "") {
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-center; background: #f8fafc; padding: 24px; font-family: sans-serif;">
        <div style="background: white; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); padding: 32px; max-width: 400px; width: 100%; border: 1px solid #fee2e2; text-align: center;">
          <h1 style="font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">Initialization Error</h1>
          <p style="color: #64748b; margin-bottom: 24px; font-size: 14px;">The application failed to start. This might be due to an older browser or a network issue.</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; overflow: auto; max-height: 150px;">
            <p style="font-size: 11px; font-family: monospace; color: #dc2626; margin: 0; word-break: break-all;">${message}</p>
          </div>
          <button onclick="window.location.reload()" style="width: 100%; padding: 12px; background: #4f46e5; color: white; border-radius: 12px; font-weight: bold; border: none; cursor: pointer;">Refresh Page</button>
        </div>
      </div>
    `;
  }
  return false;
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);