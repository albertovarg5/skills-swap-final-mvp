import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SkillsProvider } from "./context/SkillsContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SkillsProvider>
          <App />
        </SkillsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
