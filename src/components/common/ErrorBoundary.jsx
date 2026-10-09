import { Component } from "react";
import { usePreferences } from "../../contexts/PreferencesContext.jsx";

function ErrorFallback() {
  const { t } = usePreferences();
  return <main className="error-boundary"><h1>{t("errorBoundaryTitle")}</h1><p>{t("genericError")}</p><button onClick={() => window.location.reload()}>{t("reloadPage")}</button></main>;
}

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Application rendering error", error, info); }
  render() {
    if (this.state.error) return <ErrorFallback />;
    return this.props.children;
  }
}
