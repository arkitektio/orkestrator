import { Guard } from "@/core/connection/arkitekt/host";
import { Arkitekt } from "@/app/Arkitekt";
// Installs every module's builtins; must precede anything that reads a registry.
import "@/app/modules/install";
import { ModuleBackground } from "@/core/modules/registries";
import "@/app/configureSmartBuilder";
// Hands the menu its sections (providers/smart/hostRegistries).
import "@/core/smart/smartcontext";
import { DialogProvider } from "@/core/dialogs/registry";
import { LocalActionProvider } from "@/core/smart/localactions/registry";
import { ModuleLayout } from "@/core/layout/ModuleLayout";
import { PageLayout } from "@/core/layout/PageLayout";
import { Button } from "@/core/ui/button";
import { ButtonGroup } from "@/core/ui/button-group";
import { Toaster } from "@/core/ui/sonner";
import { UpdateListener } from "@/app/updates/UpdateListener";
import { TooltipProvider } from "@/core/ui/tooltip";
import { useFatalReport } from "@/core/debug/use-report";
import { ThemeProvider } from "@/core/settings/theme/ThemeProvider";
import { DebugProvider } from "@/core/debug/DebugProvider";
import { SelectionProvider } from "@/core/dnd/selection/SelectionProvider";
import { SettingsProvider } from "@/core/settings/store/SettingsProvider";
import { SmartProvider } from "@/core/smart/provider";
import { SmartPrefetchProvider } from "@/core/smart/SmartPrefetchProvider";
import { SmartSurface } from "@/core/smart/SmartSurface";
import { ExportHost } from "@/core/modules/export/ExportHost";
import { WidgetRegistryProvider } from "@/core/ports/engine/WidgetsProvider";
import React from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { useNavigate } from "react-router-dom";
import { DisplayProvider } from "../core/smart/display/displays";
import { THE_WIDGET_REGISTRY } from "./shadCnWidgetRegistry";


function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  const reportBug = useFatalReport();

  return (
    <ModuleLayout pane={<div className="flex items-center justify-center h-full w-full"><div className="text-6xl text-muted-foreground mb-3">😬</div></div>}>
      <PageLayout title="Test">
        <div className="h-full w-full flex flex-col items-center justify-center">
          <div className="text-6xl text-muted-foreground mb-3">😬</div>
          <div className="text-2xl font-bold mb-5">
            Oh boy this is embarrassing
          </div>

          <p>Something went wrong:</p>
          <pre style={{ color: "red" }} className="my-5">
            {error.message}
          </pre>

          <p className="text-muted-foreground mb-2">
            You can try to go back and try again. But please let us know about
            this...
          </p>
          <ButtonGroup>
            <Button variant={"outline"} onClick={resetErrorBoundary}>
              Go back again
            </Button>
            <Button className="ml-2"
              variant={"destructive"}
              onClick={() => reportBug(error)}
            >
              Report Bug
            </Button>
          </ButtonGroup>
        </div>
      </PageLayout>
    </ModuleLayout>
  );
}

export const BackNavigationErrorCatcher = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallbackRender={(props) => <ErrorFallback {...props} />}
      onReset={() => {

        navigate(-1);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

import { UploadProvider } from "@/core/datalayer/UploadProvider";
import { DownloadProvider } from "@/core/modules/download/DownloadProvider";

// The AppProvider is the root component of the application.
// It is responsible for providing all the context providers that are used in the application.
// It wraps the Easy Provider, which allows for the configuration of an Easy App through Arkitekt,
// Additionally, it wraps the DisplayProvider, which allows for the configuration of the display registry.
import { AgentProvider } from "../core/agent/AgentProvider";
import { WardRegistrar } from "@/core/connection/arkitekt/WardRegistrar";
import { RefetchOnReactivate } from "@/app/hooks/use-refetch-on-reactivate";
import { GcOnNavigate } from "@/app/hooks/use-gc-on-navigate";
import { OrganizationBrandSync } from "@/lok/components/OrganizationBrandSync";
import { ProfileIdentitySync } from "@/lok/components/ProfileIdentitySync";
import { MeshSync } from "../core/connection/ui/mesh/MeshSync";
import { CommandPaletteProvider } from "@/core/command/CommandPaletteProvider";
import { CommandMenuHost } from "@/core/command/Host";
import { ActiveTabRouter } from "@/core/tabs/ActiveTabRouter";
import { TabsProvider } from "@/core/tabs/TabsProvider";
import { VoiceInput } from "@/core/voice";


/**
 * Remounts everything tenant-scoped when the live profile changes.
 *
 * A switch changes organization, and organization ids are threaded through
 * selection state, open dialogs, agent state and widget registrations — all of
 * which would otherwise keep pointing at rows the new profile cannot see.
 * Keying the subtree throws that state away wholesale, which is exactly right
 * for a switch and needs no per-provider reset logic.
 *
 * Deliberately INSIDE `Arkitekt.Provider`: keying above it would remount the
 * provider itself and re-run bootstrap, i.e. the switch would fight itself.
 */
const ProfileScope = ({ children }: { children: React.ReactNode }) => {
  const activeProfileId = Arkitekt.useActiveProfileId();
  return <React.Fragment key={activeProfileId ?? "guest"}>{children}</React.Fragment>;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SettingsProvider>
      <UploadProvider>
        <DownloadProvider>
            <DebugProvider>
                  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                  {/* This is where we configure the application automatically based on facts */}

                  <Arkitekt.Provider>
                    {/* Tabs live above ProfileScope (per membership, re-booted on
                        switch) and the chrome router below them always reflects
                        the ACTIVE tab, so every useNavigate/useLocation in this
                        tree keeps working unchanged. */}
                    <TabsProvider>
                    <ActiveTabRouter>
                    <LocalActionProvider>
                      <TooltipProvider>
                        <DisplayProvider>
                          <WidgetRegistryProvider registry={THE_WIDGET_REGISTRY}>
                            <ProfileScope>
                            <SmartProvider>
                              <DialogProvider>
                                <SelectionProvider>
                                  <SmartPrefetchProvider>
                                  <AgentProvider disabled={false}>
                                    <CommandPaletteProvider>
                                    <WardRegistrar />
                                    <MeshSync />
                                    {/* The cached brand, from the first frame — not after lok answers. */}
                                    <OrganizationBrandSync />
                                    {/* One palette for the whole app. It used to
                                        be mounted per page, so it was missing on
                                        the dashboard and double-bound wherever
                                        two pages nested. */}
                                    {/* No palette signed out: there is no pill for it to unfold
                                        from and nothing for it to open. Same guard as `AppShell`. */}
                                    <Arkitekt.Guard notConnectedFallback={null} connectingFallback={null}>
                                      <CommandMenuHost />
                                      {/* Dictation into the palette and text fields.
                                          Renders nothing until Settings → Voice input is on. */}
                                      <VoiceInput />
                                    </Arkitekt.Guard>
                                    <SmartSurface />
                                    <RefetchOnReactivate />
                                    <GcOnNavigate />
                                    <ExportHost />
                                    {/* Every module's always-on builtins (updaters,
                                        dashboard widgets), each behind its guard. */}
                                    <ModuleBackground />
                                    <Guard.Lok notConnectedFallback={<></>} connectingFallback={<></>}>
                                      <ProfileIdentitySync />
                                    </Guard.Lok>
                                    <Toaster />
                                    {/* One subscription to the app updater, for
                                        the rail island and the settings card. */}
                                    <UpdateListener />
                                    <BackNavigationErrorCatcher>
                                      {children}
                                    </BackNavigationErrorCatcher>
                                    </CommandPaletteProvider>
                                  </AgentProvider>
                                  </SmartPrefetchProvider>
                                </SelectionProvider>
                              </DialogProvider>
                            </SmartProvider>
                            </ProfileScope>
                          </WidgetRegistryProvider>
                        </DisplayProvider>
                      </TooltipProvider>
                    </LocalActionProvider>
                    </ActiveTabRouter>
                    </TabsProvider>
                  </Arkitekt.Provider>
                </ThemeProvider>
          </DebugProvider>
      </DownloadProvider>
    </UploadProvider>
  </SettingsProvider>
  );
};
