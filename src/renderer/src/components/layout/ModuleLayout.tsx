import {
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";

export type ModuleLayoutProps = {
  children: React.ReactNode;
  /**
   * Accepted but no longer rendered.
   *
   * Each module's navigation now lives in the app rail (`ActiveModuleNav`),
   * which is what removed the sidebar-beside-a-sidebar this layout used to
   * create — and with it the per-module search box, superseded by ⌘K searching
   * every module at once. The prop is kept so the twelve module files that pass
   * it need not all change at once; `moduleNavRegistry.ts` is where a module's
   * pane is wired up now.
   */
  pane?: React.ReactNode;
};

export const ModuleLayout = ({ children }: ModuleLayoutProps) => {
  return (
    <ResizablePanelGroup autoSaveId="module" direction="horizontal">
      <ResizablePanel defaultSize={100} id="module" order={2}>
        {children}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
