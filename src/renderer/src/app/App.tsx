import { AppProvider } from "./AppProvider";
import { AppShell } from "./AppShell";

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
