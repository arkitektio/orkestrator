import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

import "allotment/dist/style.css";
import "./popping.css";

import { AppProvider } from "./app/AppProvider";
import { AutoConfiguration } from "./app/AutoConfiguration";
import { OrkestratorProvider } from "./app/OrkestratorProvider";
import ProtectedRouter from "./protected/ProtectedRouter";
import PublicRouter from "./public/PublicRouter";

function App() {
  return (
    <Router>
      <OrkestratorProvider>
        <AppProvider>
          <AutoConfiguration />
          <Routes>
            {/* Public */}
            <Route path="/*" element={<PublicRouter />} />
            {/* Private */}

            <Route path="/user/*" element={<ProtectedRouter />}></Route>
          </Routes>
        </AppProvider>
      </OrkestratorProvider>
    </Router>
  );
}

export default App;
