import { windowRole } from "@/core/util/windowRole";
import { AppProvider } from "./AppProvider";
import { AppShell } from "./AppShell";
import { QuickShell } from "./QuickShell";

function App() {
  // The floating quick bar (main's QuickPaletteWindow) is this same app with
  // only the palette on screen.
  if (windowRole() === "quick") {
    return (
      <AppProvider role="quick">
        <QuickShell />
      </AppProvider>
    );
  }
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
