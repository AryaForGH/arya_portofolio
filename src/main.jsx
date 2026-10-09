import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { PreferencesProvider } from "./contexts/PreferencesContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PreferencesProvider>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </PreferencesProvider>
  </React.StrictMode>,
);
