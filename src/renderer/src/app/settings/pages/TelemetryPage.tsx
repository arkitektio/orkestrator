import { SwitchField } from "@/core/forms/SwitchField";
import { hardwareReportLines } from "@/core/settings/renderer/hardwareReport";
import type { RendererHardware } from "@/core/settings/renderer/rendererBudget";
import type { Settings } from "@/core/settings/store/validator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Bug, ScanSearch } from "lucide-react";
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

export const TelemetryPage = () => (
  <SettingsPage slug="telemetry">
    <SettingsForm>
      <p className="text-sm text-muted-foreground">
        Orkestrator sends nothing about you or this computer by itself. What it detects stays in
        its settings on this computer, and leaves only inside a bug report that you file.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" />
            Hardware detection
          </CardTitle>
          <CardDescription>
            When it first starts, Orkestrator looks at this computer's graphics card, processor,
            memory, operating system and displays. It uses the graphics card and the memory to
            decide how much 3D scenes may load (see{" "}
            <Link className="underline" to={settingsLink("renderer")}>
              Renderer
            </Link>
            ). It does not read the computer's name, your user name, serial numbers or files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchField
            name="telemetryDetectHardware"
            label="Detect this computer's hardware"
            description="Switching this off also forgets what was detected. 3D scenes then load as if this were a modest computer, unless you set the limits yourself."
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
            Reporting a bug opens a GitHub issue in your browser with the text already filled
            in. With this on, that text includes the detected hardware, which makes rendering
            problems far easier to reproduce. These details are not anonymous: they describe
            your computer, and an issue is public once you submit it. You can read and edit the
            text before you do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchField
            name="telemetryAttachHardware"
            label="Attach hardware details to bug reports"
            description="Applies to reports filed from now on."
          />
          <ReportPreview />
        </CardContent>
      </Card>
    </SettingsForm>
  </SettingsPage>
);

export default TelemetryPage;
