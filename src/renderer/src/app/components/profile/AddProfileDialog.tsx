import { Arkitekt } from "@/app/Arkitekt";
import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_COORDINATION_SERVER_URL } from "@/constants";
import { discover } from "@/lib/arkitekt/fakts/discover";
import type { FaktsEndpoint } from "@/lib/arkitekt/fakts/endpointSchema";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import React from "react";

export type AddProfileDialogProps = {
  /**
   * Skip discovery and grant straight against this deployment — the
   * "Add organization…" path, where the user is already signed into the
   * deployment and only needs to pick a different organization in the browser.
   */
  endpoint?: FaktsEndpoint;
};

/**
 * Approve one more login.
 *
 * This is a dialog rather than inline menu content for a concrete reason: the
 * grant hands off to an EXTERNAL browser (`window.api.startFakts` →
 * `shell.openExternal`) and then polls, which can take a minute, while a
 * `DropdownMenu` closes the moment anything is clicked. The dialog is somewhere
 * for the waiting state, the cancel affordance and the failure to live.
 *
 * Note what this dialog cannot do: ask for a particular organization. The active
 * organization is a claim the server puts in the token when the human approves,
 * and no grant takes an organization parameter — so the browser page is where
 * the choice happens, and the copy says so.
 */
export const AddProfileDialog = ({ endpoint }: AddProfileDialogProps) => {
  const connect = Arkitekt.useConnect();
  const cancelConnection = Arkitekt.useCancelConnection();
  const { closeDialog } = useDialog();

  const [url, setUrl] = React.useState(DEFAULT_COORDINATION_SERVER_URL);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const run = React.useCallback(
    async (target?: FaktsEndpoint) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setBusy(true);
      setError(null);

      try {
        const resolved =
          target ?? (await discover({ url, controller, timeout: 2000 }));
        await connect({ endpoint: resolved, controller });
        closeDialog();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add this account.");
      } finally {
        controllerRef.current = null;
        setBusy(false);
      }
    },
    [connect, closeDialog, url],
  );

  // The "Add organization…" path has nothing to ask, so it starts immediately.
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (endpoint && !autoStarted.current) {
      autoStarted.current = true;
      void run(endpoint);
    }
  }, [endpoint, run]);

  const cancel = () => {
    controllerRef.current?.abort();
    cancelConnection();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {endpoint ? "Add another organization" : "Add another account"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {endpoint
            ? `Approve this app again on ${endpoint.name}. Choose the organization you want on the page that opens — the organization is decided there, not here.`
            : "Enter the address of the Arkitekt deployment you want to sign in to."}
        </p>
      </div>

      {!endpoint && (
        <Input
          value={url}
          disabled={busy}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="go.arkitekt.live"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) void run();
          }}
        />
      )}

      {busy && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="flex-1">
            Waiting for approval in your browser…
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {busy ? (
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => closeDialog()}>
              Close
            </Button>
            <Button onClick={() => void run(endpoint)}>
              {error ? "Try again" : endpoint ? "Open browser" : "Continue"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AddProfileDialog;
