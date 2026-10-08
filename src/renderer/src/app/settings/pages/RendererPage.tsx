import { describeGpuMemory, formatMB } from "@/core/settings/renderer/hardwareReport";
import { canProbeRendererHardware, probeRendererHardware } from "@/core/settings/renderer/probeHardware";
import {
  MAX_DECODE_CACHE_MB,
  MAX_GPU_BUDGET_MB,
  MIN_DECODE_CACHE_MB,
  MIN_GPU_BUDGET_MB,
  reportedDeviceMemoryGiB,
  resolveRendererBudget,
  selectRenderGpu,
  type GpuBudgetSource,
  type RendererBudgetSettings,
} from "@/core/settings/renderer/rendererBudget";
import type { Settings } from "@/core/settings/store/validator";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { FormDescription, FormItem, FormLabel } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { Switch } from "@/core/ui/switch";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useEffect, useState } from "react";
import { useController, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";
import { settingsLink } from "../sections";

const MiB = 1024 * 1024;

/** Why the automatic ceiling is what it is, in one clause. */
export const describeGpuSource = (source: GpuBudgetSource): string => {
  switch (source.kind) {
    case "vram":
      return `half of the ${formatMB(source.vramMB)} on ${source.gpu.model}`;
    case "ram":
      return source.unified
        ? `a share of this computer's ${formatMB(source.totalRamMB)} of unified memory, which graphics, image data and everything else draw from`
        : `a share of this computer's ${formatMB(source.totalRamMB)} of memory, which its graphics borrow from`;
    case "legacy":
      return "an estimate, because this computer's hardware has not been detected";
    case "custom":
      return "set by you";
  }
};

/**
 * One memory limit: automatic (showing the value picked and why) or the
 * user's own number. The field holds megabytes, or null for automatic.
 */
const MemoryLimitField = ({
  name,
  label,
  autoMB,
  autoReason,
  min,
  max,
}: {
  name: "rendererGpuBudgetMB" | "rendererDecodeCacheMB";
  label: string;
  autoMB: number;
  autoReason: string;
  min: number;
  max: number;
}) => {
  const { field } = useController<Settings, typeof name>({ name });
  const automatic = field.value === null || field.value === undefined;
  // What is being typed. Committed to the form only when it is a number in
  // range, so a half-typed value never becomes the limit.
  const [draft, setDraft] = useState(automatic ? "" : String(field.value));
  useEffect(() => {
    if (!automatic) setDraft(String(field.value));
  }, [automatic, field.value]);

  const typed = Number(draft);
  const outOfRange = !automatic && (!Number.isFinite(typed) || typed < min || typed > max);

  return (
    <div className="space-y-3">
      <FormItem className="flex items-center justify-between gap-4">
        <div>
          <FormLabel>{label}</FormLabel>
          <FormDescription>
            {automatic
              ? `${formatMB(autoMB)}: ${autoReason}.`
              : `Automatic would be ${formatMB(autoMB)}.`}
          </FormDescription>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Automatic
          <Switch
            checked={automatic}
            onCheckedChange={(on) => field.onChange(on ? null : Math.round(autoMB))}
          />
        </div>
      </FormItem>
      {!automatic && (
        <FormItem>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-32"
              min={min}
              max={max}
              step={64}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                const next = Number(event.target.value);
                if (Number.isFinite(next) && next >= min && next <= max) field.onChange(next);
              }}
            />
            <span className="text-sm text-muted-foreground">MB</span>
          </div>
          {outOfRange && (
            <p className="text-sm text-destructive">
              Enter a value between {min} and {max} MB.
            </p>
          )}
        </FormItem>
      )}
    </div>
  );
};

/** What was detected, and the button that detects again. */
const HardwareCard = () => {
  const { field } = useController<Settings, "rendererHardware">({ name: "rendererHardware" });
  const allowed = useWatch<Settings, "telemetryDetectHardware">({ name: "telemetryDetectHardware" });
  const hardware = field.value ?? null;
  const [detecting, setDetecting] = useState(false);
  const [failed, setFailed] = useState(false);
  const available = canProbeRendererHardware();
  const renderGpu = hardware ? selectRenderGpu(hardware) : null;

  const detect = async () => {
    setDetecting(true);
    setFailed(false);
    const next = await probeRendererHardware();
    setDetecting(false);
    if (next) field.onChange(next);
    else setFailed(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          This computer
        </CardTitle>
        <CardDescription>
          What Orkestrator found when it first started here. The automatic limits below are
          derived from the graphics and the memory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hardware ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {hardware.gpus.length === 0 && (
              <>
                <dt className="text-muted-foreground">Graphics</dt>
                <dd>None found</dd>
              </>
            )}
            {hardware.gpus.map((gpu, index) => (
              <div key={`${gpu.model}-${index}`} className="contents">
                <dt className="text-muted-foreground">Graphics</dt>
                <dd>
                  {gpu.model}
                  <span className="text-muted-foreground">
                    {`, ${describeGpuMemory(gpu, hardware)}`}
                    {gpu.driverVersion ? `, driver ${gpu.driverVersion}` : ""}
                    {hardware.gpus.length > 1 && gpu === renderGpu ? " (used for scenes)" : ""}
                  </span>
                </dd>
              </div>
            ))}
            {hardware.cpu && (
              <>
                <dt className="text-muted-foreground">Processor</dt>
                <dd>
                  {hardware.cpu.brand}
                  <span className="text-muted-foreground">
                    , {hardware.cpu.physicalCores} cores / {hardware.cpu.cores} threads
                  </span>
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Memory</dt>
            <dd>{formatMB(hardware.totalRamMB)}</dd>
            {hardware.os && (
              <>
                <dt className="text-muted-foreground">System</dt>
                <dd>
                  {[hardware.os.distro || hardware.os.platform, hardware.os.release]
                    .filter(Boolean)
                    .join(" ")}
                  <span className="text-muted-foreground">
                    {hardware.os.kernel ? `, kernel ${hardware.os.kernel}` : ""}
                  </span>
                </dd>
              </>
            )}
            {hardware.displays && hardware.displays.length > 0 && (
              <>
                <dt className="text-muted-foreground">Displays</dt>
                <dd>
                  {hardware.displays
                    .map(
                      (d) =>
                        `${d.width}×${d.height}${d.refreshRate ? ` @ ${Math.round(d.refreshRate)} Hz` : ""}`,
                    )
                    .join(", ")}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Detected</dt>
            <dd>{new Date(hardware.probedAt).toLocaleString()}</dd>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {!available
              ? "Hardware can only be detected in the desktop app. The limits below use an estimate."
              : allowed
                ? "Nothing detected yet."
                : "Hardware detection is switched off, so the limits below use an estimate."}
          </p>
        )}
        {available && !allowed && (
          <p className="text-sm text-muted-foreground">
            Switch it on under{" "}
            <Link className="underline" to={settingsLink("telemetry")}>
              Telemetry
            </Link>
            .
          </p>
        )}
        {available && allowed && (
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" disabled={detecting} onClick={detect}>
              {detecting ? "Detecting…" : hardware ? "Detect again" : "Detect"}
            </Button>
            {failed && (
              <p className="text-sm text-destructive">
                Detection failed. The previous values are still in use.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** The two limits. Reads the live form, so "automatic" follows a fresh
 * detection or a changed ceiling at once. */
const LimitsCards = () => {
  const values = useWatch<Settings>() as RendererBudgetSettings;
  const budget = resolveRendererBudget(values, reportedDeviceMemoryGiB());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MemoryStick className="h-5 w-5" />
            Graphics memory
          </CardTitle>
          <CardDescription>
            How much of the graphics card 3D scenes may fill with image data. More lets a scene
            show finer detail over a larger area; too much leaves none for other applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemoryLimitField
            name="rendererGpuBudgetMB"
            label="Graphics memory limit"
            autoMB={budget.autoGpuBudgetBytes / MiB}
            autoReason={describeGpuSource(budget.autoGpuSource)}
            min={MIN_GPU_BUDGET_MB}
            max={MAX_GPU_BUDGET_MB}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Image data cache
          </CardTitle>
          <CardDescription>
            System memory for image data that was downloaded and unpacked, kept so moving back to
            a region does not download it again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemoryLimitField
            name="rendererDecodeCacheMB"
            label="Cache limit"
            autoMB={budget.autoDecodeCacheBytes / MiB}
            autoReason="half the graphics memory limit, within what this computer's memory allows"
            min={MIN_DECODE_CACHE_MB}
            max={MAX_DECODE_CACHE_MB}
          />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        A new graphics memory limit applies to scenes opened from now on. A new cache limit
        applies after Orkestrator restarts.
      </p>
    </>
  );
};

export const RendererPage = () => (
  <SettingsPage slug="renderer">
    <SettingsForm>
      <HardwareCard />
      <LimitsCards />
    </SettingsForm>
  </SettingsPage>
);

export default RendererPage;
