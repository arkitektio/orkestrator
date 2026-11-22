import "./core/connection/graphql/gqlSetup";
import "./core/blok/platform";
import { installDiagnostics } from "./core/diagnostics/install";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { preloadWindow, warmEngines } from "./app/boot";
import "./index.css";

installDiagnostics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Every split chunk is loaded right after the first render, so a page, viewer
// or blok opened later does not flash its loading fallback (`app/boot`). Never
// awaited before rendering: in the built app the split chunks import from this
// entry chunk, and a top-level await here suspends the entry they wait on —
// the window stayed blank (`e2e/smoke.spec.ts` guards it).
void preloadWindow().catch((error: unknown) => console.warn("[boot] preloading the split chunks failed", error));

warmEngines();
