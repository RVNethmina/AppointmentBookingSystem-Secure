
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import AdminContextProvider from "./Context/AdminContext.jsx";
import DoctorContextProvider from "./Context/DoctorContext.jsx";
import AppContextProvider from "./Context/AppContext.jsx";
import { installSessionInterceptor } from "./utils/sessionInterceptor.js";

// clears the admin or doctor session when the API rejects its token
installSessionInterceptor({ atoken: "aToken", dtoken: "dToken" });

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AdminContextProvider>
      <DoctorContextProvider>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </DoctorContextProvider>
    </AdminContextProvider>
  </BrowserRouter>
);
