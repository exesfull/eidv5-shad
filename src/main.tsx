// import { StrictMode } from "react"
// import LoginPage from "./pages/LoginPage";
// import { createRoot } from "react-dom/client"

// import "./index.css"
// import { ThemeProvider } from "@/components/theme-provider.tsx"

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <ThemeProvider>
//       <LoginPage />
//     </ThemeProvider>
//   </StrictMode>
// )
// src/main.tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "@/components/theme-provider"
import AppRouter from "@/router"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  </StrictMode>
)