import { useEffect, useRef } from "react";
import { useSettingsStore, useSettingsStoreApi } from "../store/SettingsContext";
import { canProbeRendererHardware, probeRendererHardware } from "./probeHardware";

/**
 * Nothing is known about this computer yet (first start, or detection was just
 * switched back on): ask main once and keep the answer in the settings. Every
 * later boot reads it from there — the memory ceiling has to be known before a
 * scene can mount, and a probe is not.
 *
 * Only while the user allows it (`telemetryDetectHardware`, on unless switched
 * off in Settings → Telemetry).
 *
 * Saved onto the settings as they are when the answer arrives, not as they
 * were when it was asked for: a change made in between must survive, and
 * permission withdrawn in between must hold.
 */
export function useFirstStartHardwareProbe(): void {
  const store = useSettingsStoreApi();
  const allowed = useSettingsStore((state) => state.settings?.telemetryDetectHardware === true);
  const known = useSettingsStore((state) => !!state.settings?.rendererHardware);
  /** One attempt per grant: a probe that fails is not retried until the
   * permission is given again or the app restarts. */
  const asked = useRef(false);

  useEffect(() => {
    if (!allowed) {
      asked.current = false;
      return;
    }
    if (known || asked.current || !canProbeRendererHardware()) return;
    asked.current = true;
    // Not cancelled on cleanup: the answer is written to the store, which
    // outlives this effect, and StrictMode's double mount would otherwise
    // throw the only probe away.
    void probeRendererHardware().then((hardware) => {
      if (!hardware) return;
      const { settings, setSettings } = store.getState();
      if (settings?.telemetryDetectHardware && !settings.rendererHardware) {
        setSettings({ ...settings, rendererHardware: hardware });
      }
    });
  }, [allowed, known, store]);
}
