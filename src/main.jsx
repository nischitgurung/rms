import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext'; // <--- IMPORT THIS
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <UserProvider> {/* <--- WRAP APP HERE */}
          <App />
        </UserProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);