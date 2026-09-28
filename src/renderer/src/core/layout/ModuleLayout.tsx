import { useTabPane } from "@/core/tabs/TabPaneContext";

import {
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";

export type ModuleLayoutProps = {
  children: React.ReactNode;
};

export const ModuleLayout = ({ children }: ModuleLayoutProps) => {
  // A split shows two of these at once; the right pane saves its sizes under
  // its own key so the two do not overwrite each other's.
  const pane = useTabPane();
  return (
    <ResizablePanelGroup
      autoSaveId={pane === "right" ? "module:right" : "module"}
      direction="horizontal"
    >
      <ResizablePanel defaultSize={100} id="module" order={2}>
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
