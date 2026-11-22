import "./core/connection/graphql/gqlSetup";
import "./core/blok/platform";
import { installDiagnostics } from "./core/diagnostics/install";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { preloadWindow, warmEngines } from "./app/boot";
import "./index.css";

installDiagnostics();

// Every split chunk is in before the first render, so nothing flashes its
// loading fallback on first use (`app/boot`).
await preloadWindow();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

warmEngines();
