import { SwitchField } from "@/components/fields/SwitchField";
import { PageLayout } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorModeField } from "../components/ColorModeField";
import { ThemeCustomizer } from "../components/ThemeCustomizer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UpdateChecker } from "@/components/ui/update-checker";
import { Arkitekt } from "@/app/Arkitekt";
import {
  useLocalActionEntries,
  usePinnedActionIds,
  useTogglePinnedAction,
} from "@/app/localactions";
import type { Action } from "@/lib/localactions/LocalActionProvider";
import { useDebug } from "@/providers/debug/DebugContext";
import { useSettings } from "@/providers/settings/SettingsContext";
import { getPlatform } from "@/lib/platform";
import { Slider } from "@/components/ui/slider";
import {
  Bug,
  CheckCircle,
  Globe,
  LogOut,
  Minus,
  Plus,
  Search,
  Send,
  Server,
  Settings,
  Pin,
  XCircle,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { Settings as UserSettings } from "@/providers/settings/validator";
import { VoiceSettingsCard } from "@/voice";

export type IRepresentationScreenProps = Record<string, never>;

// Component to display fakts data in a structured way
const FaktsViewer: React.FC<{ fakts: unknown }> = ({ fakts }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground">None</span>;
    if (value === undefined)
      return <span className="text-muted-foreground">Undefined</span>;
    if (typeof value === "boolean")
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value.toString()}
        </Badge>
      );
    if (typeof value === "string") {
      if (value.startsWith("http")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            {value}
          </a>
        );
      }
      return <span className="text-green-400">&quot;{value}&quot;</span>;
    }
    if (typeof value === "number")
      return <span className="text-orange-400">{value}</span>;
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          {value.map((item, index) => (
            <div key={index} className="border-l border-border pl-2 my-1">
              [{index}]: {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="ml-4">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="border-l border-border pl-2 my-1">
              <span className="text-blue-300 font-medium">{k}:</span>{" "}
              {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const filterData = (data: unknown, search: string): unknown => {
    if (!search) return data;

    const searchLower = search.toLowerCase();

    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>,
      )) {
        if (key.toLowerCase().includes(searchLower)) {
          filtered[key] = value;
        } else if (
          typeof value === "string" &&
          value.toLowerCase().includes(searchLower)
        ) {
          filtered[key] = value;
        } else if (typeof value === "object") {
          const filteredChild = filterData(value, search);
          if (
            filteredChild &&
            typeof filteredChild === "object" &&
            Object.keys(filteredChild as Record<string, unknown>).length > 0
          ) {
            filtered[key] = filteredChild;
          }
        }
      }
      return Object.keys(filtered).length > 0 ? filtered : null;
    }

    return data;
  };

  const filteredFakts = filterData(fakts, searchTerm);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search configuration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-3">
          {filteredFakts && typeof filteredFakts === "object"
            ? Object.entries(filteredFakts as Record<string, unknown>).map(
              ([key, value]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderValue(value)}</CardContent>
                </Card>
              ),
            )
            : null}
        </div>
      </ScrollArea>
    </div>
  );
};

// Component to display services in a nice card layout
const ServiceCard: React.FC<{
  service: ServiceRuntimeState;
}> = ({ service }) => {
  const isUnresolved = service.status === "invalid";
  return (
    <Card
      className={
        isUnresolved ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {service.key}
          </div>
          <Badge variant={isUnresolved ? "destructive" : service.status === "checking" ? "secondary" : "default"}>
            {isUnresolved ? (
              <XCircle className="w-3 h-3 mr-1" />
            ) : service.status === "checking" ? (
              <Search className="w-3 h-3 mr-1" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            {isUnresolved ? "Invalid" : service.status === "checking" ? "Checking" : "Active"}
          </Badge>
        </CardTitle>
        {typeof service.definition.description === "string" ? (
          <CardDescription>{service.definition.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {service.instance?.identifier || "No instance available"}
        </div>

        {service.errors.length > 0 && (
          <div className="mt-3 space-y-1">
            {service.errors.map((error) => (
              <div key={error} className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs">
                {error}
              </div>
            ))}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            View Raw Configuration
          </summary>
          <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
            {JSON.stringify(service.instance, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { setSettings, settings } = useSettings();
  const fakts = Arkitekt.useFakts();
  const services = Arkitekt.useAvailableServices();
  const configurationIssues = Arkitekt.useConfigurationIssues();
  const reportStatus = Arkitekt.useReportStatus();
  const activeProfile = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();
  const disconnect = Arkitekt.useDisconnect();
  const forgetAllProfiles = Arkitekt.useForgetAllProfiles();
  const { debug, setDebug } = useDebug();
  const localActionEntries = useLocalActionEntries();
  const pinnedActionIds = usePinnedActionIds();
  const togglePinnedAction = useTogglePinnedAction();
  const [pinnedActionSearch, setPinnedActionSearch] = useState("");
  const [reporting, setReporting] = useState(false);

  const handleReportStatus = async () => {
    setReporting(true);
    try {
      const result = await reportStatus();
      if (!result) {
        toast.error("Not connected — nothing to report.");
      } else if (!result.ok) {
        toast.error("Failed to reach the coordination server.");
      } else if (result.functional) {
        toast.success("Reported status: all services reachable.");
      } else {
        toast.warning("Status reported, but some services are unreachable.");
      }
    } catch (error) {
      toast.error(
        `Failed to report status: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setReporting(false);
    }
  };


  const form = useForm<UserSettings>({
    defaultValues: settings,
  });

  const {
    formState,
    formState: { isValidating },
  } = form;

  const data = useWatch({ control: form.control });

  const sortedLocalActionEntries = [...localActionEntries].sort((left, right) => {
    const leftPinned = pinnedActionIds.includes(left.id);
    const rightPinned = pinnedActionIds.includes(right.id);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    return left.action.title.localeCompare(right.action.title);
  });

  const filteredLocalActionEntries = sortedLocalActionEntries.filter(({ id, action }) => {
    if (!pinnedActionSearch) {
      return true;
    }

    const loweredSearch = pinnedActionSearch.toLowerCase();

    return (
      id.toLowerCase().includes(loweredSearch) ||
      action.title.toLowerCase().includes(loweredSearch) ||
      action.description.toLowerCase().includes(loweredSearch)
    );
  });

  useEffect(() => {
    if (formState.isValid && !isValidating) {
      setSettings(data as UserSettings);
    }
  }, [data, formState.isValid, isValidating, setSettings]);

  return (
    <PageLayout
      pageActions={
        <>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleReportStatus}
            disabled={reporting || !fakts}
          >
            <Send className="w-4 h-4" />
            {reporting ? "Reporting…" : "Report Status"}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Inspect Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="min-w-[80vw] max-w-[90vw] h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Application Configuration (Fakts)
                </DialogTitle>
              </DialogHeader>
              <FaktsViewer fakts={fakts} />
            </DialogContent>
          </Dialog>
        </>
      }
      title="Application Settings"
    >
      <div className="space-y-8">

        {/* Account — what used to sit below the organization switcher. The
            switcher only picks organizations now. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account
            </CardTitle>
            <CardDescription>
              {activeProfile
                ? `Signed in as ${activeProfile.label.username || "unknown user"} in ${activeProfile.label.organizationName || activeProfile.label.deploymentName || "an organization"}.`
                : "Not signed in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {/* Parks rather than wipes: the login stays in the switcher. */}
            <Button
              variant="outline"
              className="gap-2"
              disabled={!activeProfile}
              onClick={() => void disconnect()}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={profiles.length === 0}
              onClick={() => {
                void forgetAllProfiles().then(() =>
                  toast.success("Forgot every account on this computer."),
                );
              }}
            >
              <Trash2 className="w-4 h-4" />
              Forget all accounts
            </Button>
          </CardContent>
        </Card>

        {/* App Updates Section */}
        <Card>
          <CardHeader>
            <CardTitle>Application Updates</CardTitle>
            <CardDescription>
              Check for and manage application updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateChecker />
          </CardContent>
        </Card>

        {/* Developer Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Developer Tools
            </CardTitle>
            <CardDescription>
              Open Chrome DevTools to inspect the application, view console
              logs, and debug issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.api?.openDevTools()}
            >
              <Bug className="w-4 h-4" />
              Open DevTools
            </Button>
            <Button
              variant={debug ? "default" : "outline"}
              className="gap-2"
              onClick={() => setDebug(!debug)}
            >
              <Bug className="w-4 h-4" />
              Debug Mode: {debug ? "On" : "Off"}
            </Button>
          </CardContent>
        </Card>

        <Form {...form}>
          <form className="space-y-8">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ColorModeField />
                <SwitchField
                  name="sceneThemeSync"
                  label="Scene Theme Sync"
                  description="Tint the app to the main layer's colormap while a scene or image is open"
                />
                {/* The OS draws this (macOS vibrancy, Windows acrylic); Linux
                    and the browser have nothing to switch on. */}
                {(getPlatform() === "darwin" || getPlatform() === "win32") && (
                  <>
                    <SwitchField
                      name="railGlass"
                      label="Translucent sidebar"
                      description="Let the desktop show through the sidebar, blurred, the way macOS windows do"
                    />
                    {data.railGlass && (
                      <FormField
                        control={form.control}
                        name="railGlassTransparency"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-row items-center justify-between gap-4">
                              <FormLabel>
                                Sidebar transparency ({Math.round((field.value ?? 0.7) * 100)}%)
                              </FormLabel>
                              <FormControl>
                                <Slider
                                  className="w-40"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={[Math.round((field.value ?? 0.7) * 100)]}
                                  onValueChange={([value]) => field.onChange(value / 100)}
                                />
                              </FormControl>
                            </div>
                            <FormDescription>
                              How much of the desktop shows through. Lower keeps more of the sidebar colour for legibility.
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
                <ThemeCustomizer control={form.control} />
              </CardContent>
            </Card>

            {/* Settings Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  User Preferences
                </CardTitle>
                <CardDescription>
                  Customize your application experience with these settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SwitchField
                      name="showHoverCards"
                      label="Hover Previews"
                      description="Show a detail preview card when hovering over items"
                    />
                    <SwitchField
                      name="experimentalViv"
                      label="Experimental Viv"
                      description="Enable experimental visualization features"
                    />
                    <SwitchField
                      name="experimentalCache"
                      label="Experimental Cache Mode"
                      description="Cache image layers for better performance"
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="defaultZoomLevel"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-row items-center justify-between w-full gap-2">
                          <div className="flex flex-col gap-1">
                            <FormLabel>
                              Page zoom ({Math.round((field.value || 1.0) * 100)}%)
                            </FormLabel>
                            <FormDescription>
                              Scales the page content. The sidebar keeps its size.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const currentValue = field.value || 1.0;
                                  const newValue = Math.max(
                                    0.25,
                                    currentValue - 0.05,
                                  );
                                  field.onChange(newValue);
                                }}
                                disabled={(field.value || 1.0) <= 0.25}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="min-w-[80px] text-center text-sm font-medium">
                                {Math.round((field.value || 1.0) * 100)}%
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const currentValue = field.value || 1.0;
                                  const newValue = Math.min(
                                    3.0,
                                    currentValue + 0.05,
                                  );
                                  field.onChange(newValue);
                                }}
                                disabled={(field.value || 1.0) >= 3.0}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </FormControl>
                        </div>
                        <FormDescription>
                          Set the default zoom level for the application (25% -
                          300%)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <VoiceSettingsCard />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pin className="w-5 h-5" />
                  Pinned Actions
                </CardTitle>
                <CardDescription>
                  Choose which local actions should appear in the pinned section at the top of the command palette.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {pinnedActionIds.length > 0 ? (
                    sortedLocalActionEntries
                      .filter(({ id }) => pinnedActionIds.includes(id))
                      .map(({ id, action }) => (
                        <Badge key={id} variant="secondary" className="gap-1 px-3 py-1">
                          {action.title}
                        </Badge>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No actions are pinned yet.
                    </p>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={pinnedActionSearch}
                    onChange={(event) => setPinnedActionSearch(event.target.value)}
                    placeholder="Search actions by title, description, or id"
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-72 rounded-md border">
                  <div className="space-y-2 p-3">
                    {filteredLocalActionEntries.map(({ id, action }) => {
                      const isPinned = pinnedActionIds.includes(id);
                      const isRequiredPin = (action as Action).pinned === true;

                      return (
                        <div
                          key={id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-background/60 p-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium leading-none">{action.title}</p>
                              {isPinned ? <Badge variant="default">Pinned</Badge> : null}
                              {isRequiredPin ? <Badge variant="secondary">Always</Badge> : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                            <p className="text-xs text-muted-foreground">{id}</p>
                          </div>
                          <Button
                            type="button"
                            variant={isPinned ? "default" : "outline"}
                            disabled={isRequiredPin}
                            onClick={() => togglePinnedAction(id)}
                          >
                            {isRequiredPin ? "Always pinned" : isPinned ? "Unpin" : "Pin"}
                          </Button>
                        </div>
                      );
                    })}
                    {filteredLocalActionEntries.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No actions matched the current filter.
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </form>
        </Form>

        {/* Services Section */}
        <div className="space-y-4">
          {configurationIssues.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <XCircle className="w-5 h-5" />
                  Configuration Issues
                </CardTitle>
                <CardDescription>
                  Fakts was retrieved, but some expected services or module dependencies are missing or invalid.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {configurationIssues.map((issue) => (
                  <div key={issue} className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm">
                    {issue}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Server className="w-6 h-6" />
              Connected Services
            </h2>
            <p className="text-muted-foreground mt-1">
              Services that are currently active and configured in your
              application.
            </p>
          </div>

          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard key={service.key} service={service} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active services found</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Page;
