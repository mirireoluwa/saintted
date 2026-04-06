import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./contexts/ThemeContext";
import { prefetchReleaseCountdown } from "./api/prefetch";
import "./index.css";
import App from "./App.tsx";

prefetchReleaseCountdown();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (typeof sentryDsn === "string" && sentryDsn.trim()) {
  Sentry.init({
    dsn: sentryDsn.trim(),
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.08,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
