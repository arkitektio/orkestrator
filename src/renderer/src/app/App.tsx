import { AppLayout } from "@/components/layout/AppLayout";
import { TabOutlet } from "@/command/tabs/TabOutlet";
import { AppProvider } from "./AppProvider";
import { AppRoutes } from "./AppRoutes";
import { PrivateNavigationBar } from "./components/navigation/PrivateNavigationBar";

function App() {
  return (
    <AppProvider>
      <AppLayout navigationBar={<PrivateNavigationBar />}>
        {/* One copy of the routes per open tab, each with its own history. */}
        <TabOutlet routes={<AppRoutes />} />
      </AppLayout>
    </AppProvider>
  );
}

export default App;
