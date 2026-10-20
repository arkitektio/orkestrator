import { meshFirewallAsk } from "@/core/connection/mesh/firewallNotice";
import { useDialog } from "@/core/dialogs/registry";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Opens the firewall explainer when the mesh gate asks for it
 * (`meshFirewallGate`). Mounted in windows that show their own dialogs; with
 * none mounted (the quick bar) the gate does not wait. Renders nothing.
 */
export const MeshFirewallPrompt = () => {
  const asking = useSyncExternalStore(meshFirewallAsk.subscribe, meshFirewallAsk.getSnapshot);
  const { openDialog } = useDialog();

  useEffect(() => {
    if (asking) openDialog("meshfirewall", {}, { size: "small" });
  }, [asking, openDialog]);

  return null;
};

export default MeshFirewallPrompt;
