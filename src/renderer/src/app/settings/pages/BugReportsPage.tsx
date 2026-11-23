import { SwitchField } from "@/core/forms/SwitchField";
import { hardwareReportLines } from "@/core/settings/renderer/hardwareReport";
import type { RendererHardware } from "@/core/settings/renderer/rendererBudget";
import type { Settings } from "@/core/settings/store/validator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/core/ui/alert";
import { Bug, ScanSearch, ShieldCheck } from "lucide-react";
import { useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";
import { settingsLink } from "../sections";

/**
 * Exactly what a bug report would carry right now — the same lines, from the
 * same function, the report itself uses.
 */
const ReportPreview = () => {
  const hardware = useWatch<Settings, "rendererHardware">({ name: "rendererHardware" }) as
    | RendererHardware
    | null
    | undefined;
  const attach = useWatch<Settings, "telemetryAttachHardware">({ name: "telemetryAttachHardware" });

  if (!attach) {
    return (
      <p className="text-sm text-muted-foreground">
        Bug reports say only which version of Orkestrator and which operating system you use.
      </p>
    );
  }
  if (!hardware) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has been detected, so there is nothing to attach.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">A report filed now would include:</p>
      <ul className="space-y-1 rounded-md border bg-muted/40 p-3 font-mono text-xs">
        {hardwareReportLines(hardware).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Settings → Bug reports. It was called "Telemetry", which read as if the app
 * reported on its own; it does not, and the page now opens by saying so. The
 * stored settings keep their `telemetry…` names.
 */
export const BugReportsPage = () => (
  <SettingsPage slug="reports">
    <SettingsForm>
      <Alert role="note" className="border-primary/30 bg-primary/5">
        <ShieldCheck className="text-primary" />
        <AlertTitle>No telemetry</AlertTitle>
        <AlertDescription>
          No data ever travels to the developers of Arkitekt unless you choose to send it, or an
          admin of your organization does.
        </AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        Only a bug report you file leaves this computer. It goes to the admins of your
        organization, or, if you press the button for it, to GitHub as an issue.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" />
            Hardware detection
          </CardTitle>
          <CardDescription>
            Orkestrator looks at this computer's graphics card and memory to decide how much 3D
            scenes may load (see{" "}
            <Link className="underline" to={settingsLink("renderer")}>
              Renderer
            </Link>
            ). It reads no names, serial numbers or files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchField
            name="telemetryDetectHardware"
            label="Detect this computer's hardware"
            description="Off also forgets what was detected; 3D scenes then load as on a modest computer."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Bug reports
          </CardTitle>
          <CardDescription>
            What a report carries besides your description. The app version, your operating
            system and the page you are on always go along; press “Debug yourself” in a report to
            see each part first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchField
            name="telemetryReportScreenshot"
            label="Screenshot"
            description="A picture of the window as it is when you ask to report."
          />
          <SwitchField
            name="telemetryReportErrors"
            label="Recent errors"
            description="The last errors this window showed or ran into, with their technical text."
          />
          <SwitchField
            name="telemetryReportRequests"
            label="Failed requests"
            description="Which requests to the server failed and what it answered. Never what it returned."
          />
          <SwitchField
            name="telemetryReportSteps"
            label="Steps before the report"
            description="The pages you opened and the dialogs and actions you used, by name."
          />
          <SwitchField
            name="telemetryReportConsole"
            label="Console warnings and errors"
            description="The last warnings and errors the app logged."
          />
          <SwitchField
            name="telemetryReportVariables"
            label="Request variables"
            description="The ids and inputs of the failed requests and of the page's queries."
          />
          <SwitchField
            name="telemetryReportData"
            label="What the page loaded"
            description="The data the page's queries returned: your own data, so off by default."
          />
          <SwitchField
            name="telemetryAttachHardware"
            label="Attach hardware details to bug reports"
            description="Makes rendering problems far easier to reproduce."
          />
          <ReportPreview />
        </CardContent>
      </Card>
    </SettingsForm>
  </SettingsPage>
);

export default BugReportsPage;
