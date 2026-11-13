import "./core/connection/graphql/gqlSetup";
import "./core/blok/platform";
import { installDiagnostics } from "./core/diagnostics/install";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

installDiagnostics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
