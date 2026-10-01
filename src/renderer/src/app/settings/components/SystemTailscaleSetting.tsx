import { doctorAvailable } from "@/core/connection/arkitekt/doctor/useConnectionDoctor";
import { useSettings } from "@/core/settings/store/SettingsContext";
import type { Settings } from "@/core/settings/store/validator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";

const LABEL: Record<Settings["systemTailscale"], string> = {
  ask: "Ask first",
  always: "Always",
  never: "Never",
};

/**
 * Whether the app may run `tailscale status` for a Tailscale it does not run
 * itself. The connection diagram asks in place and can remember the answer;
 * this is where a remembered answer is changed back.
 */
export const SystemTailscaleSetting = () => {
  const { settings, setSettings } = useSettings();
  // Only the desktop app can run the CLI at all.
  if (!doctorAvailable()) return null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">Read the system Tailscale</div>
        <p className="text-xs text-muted-foreground">
          Run <span className="font-mono">tailscale status</span> to show how addresses on a Tailscale network this
          app does not run are routed: a direct tunnel, or a DERP relay. The built-in mesh never needs this.
        </p>
      </div>
      <Select
        value={settings.systemTailscale}
        onValueChange={(value) => setSettings({ ...settings, systemTailscale: value as Settings["systemTailscale"] })}
      >
        <SelectTrigger className="w-32 shrink-0" aria-label="Read the system Tailscale">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LABEL) as Settings["systemTailscale"][]).map((value) => (
            <SelectItem key={value} value={value}>
              {LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
