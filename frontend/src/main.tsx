import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import CustomerApp from "./customer/CustomerApp"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerApp />
  </StrictMode>
)
