import { StrictMode } from "react"
import LoginPage from "./pages/LoginPage";
import { createRoot } from "react-dom/client"



import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LoginPage />
    </ThemeProvider>
  </StrictMode>
)
