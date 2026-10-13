import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setupNative } from "./ui/native";
import { App } from "./ui/App";
import { initStorage } from "./ui/storage";
import "./ui/styles.css";

await initStorage();
setupNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
