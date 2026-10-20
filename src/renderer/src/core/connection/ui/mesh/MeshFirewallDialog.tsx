import { acknowledgeMeshFirewall } from "@/core/connection/mesh/firewallNotice";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

/**
 * Shown once, on Windows, right before the first mesh starts: what the
 * firewall dialog is about to ask and what to click. However it closes, the
 * mesh starts then — the gate is released when this unmounts.
 */
export const MeshFirewallDialog = () => {
  const { closeDialog } = useDialog();

  useEffect(() => () => acknowledgeMeshFirewall(), []);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Windows will ask about the mesh
        </DialogTitle>
        <DialogDescription>
          Your organisation's mesh is starting. It connects this computer straight to the other machines on it — and
          for that, other machines have to be able to reach this one. That is what Windows is about to ask.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 text-sm">
        <p>
          When the Windows Defender Firewall dialog appears, click <strong>Allow access</strong>.
        </p>
        <p className="text-muted-foreground">
          Allowing needs administrator rights. Without them, click Cancel: the mesh still works, but some connections
          go through a relay and are slower.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={closeDialog}>Continue</Button>
      </DialogFooter>
    </>
  );
};

export default MeshFirewallDialog;
