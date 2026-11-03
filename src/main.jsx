import React from "react";
import { createRoot } from "react-dom/client";
import Root from "./pages/Root";
import "./styles/index.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
