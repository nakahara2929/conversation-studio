import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // ignore service worker registration failures
    });
  });
}

