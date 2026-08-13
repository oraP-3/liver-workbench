import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const existing = await navigator.serviceWorker.getRegistration();
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    if (existing) {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new Event("lw-update"));
          }
        });
      });
    }
  });
}
