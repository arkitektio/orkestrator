import { Arkitekt } from "@/core/connection/arkitekt/host";
import { Button } from "@/core/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import {
  DEFAULT_COORDINATION_SERVER_HOST,
  DEFAULT_COORDINATION_SERVER_URL,
} from "@/core/constants";
import { ConnectionDoctorSheet } from "@/core/connection/ui/doctor/ConnectionDoctor";
import { endpointToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import { discover } from "@/core/connection/arkitekt/fakts/discover";
import { popOutWindowOpen } from "@/core/connection/arkitekt/fakts/popout";
import { AlertCircle, ExternalLink, Loader2, Plus, X } from "lucide-react";
import React from "react";

export type AddProfileButtonProps = {
  /**
   * `tile` is the last card in the row of parked logins — a plus, because the
   * accounts beside it are the offer. `hero` is the whole offer on a computer
   * that holds no logins yet, so it says where it is signing you in.
   */
  presentation?: "tile" | "hero";
};

/**
 * Add one more login, from the welcome screen.
 *
 * It discovers the default coordination server and grants against it; a
 * deployment this computer has never seen goes through "More Options" → custom
 * endpoint instead.
 *
 * It cannot open the `addprofile` dialog: the dialog provider renders inside
 * `Guard.Rekuest`, and there is no rekuest while we are signed out. So the
 * grant runs here, and the waiting and failure states live here with it.
 */
export const AddProfileButton = ({
  presentation = "tile",
}: AddProfileButtonProps) => {
  const connect = Arkitekt.useConnect();
  const autoLoginError = Arkitekt.useAutoLoginError();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  /** The approval page, once the grant has opened it — so it can be opened again. */
  const [verificationUri, setVerificationUri] = React.useState<string | null>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const handleConnect = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setIsConnecting(true);
      setConnectionError(null);
      setVerificationUri(null);

      const endpoint = await discover({
        url: DEFAULT_COORDINATION_SERVER_URL,
        controller,
        timeout: 2000,
      });

      await connect({
        endpoint,
        controller,
        onVerificationUri: setVerificationUri,
      });
    } catch (error) {
      // Cancelled here: the user's choice, not a failure worth a red line.
      if (!controller.signal.aborted) {
        console.error("Connection failed:", error);
        setConnectionError(
          error instanceof Error ? error.message : "Unable to connect to the coordination server.",
        );
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setIsConnecting(false);
        setVerificationUri(null);
      }
    }
  };

  const handleCancel = () => controllerRef.current?.abort();

  const handleReopen = () => {
    if (!verificationUri) return;
    void popOutWindowOpen(verificationUri).catch((error) =>
      setConnectionError(error instanceof Error ? error.message : "Could not open the browser."),
    );
  };

  /** While the grant waits on the browser: a way back to it, and a way out. */
  const waiting = isConnecting && (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReopen}
        disabled={!verificationUri}
        className="text-muted-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open browser again
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCancel} className="text-muted-foreground">
        <X className="h-3.5 w-3.5" />
        Cancel
      </Button>
    </div>
  );

  const label = `Add an account on ${DEFAULT_COORDINATION_SERVER_HOST}`;

  const failure = connectionError || autoLoginError;

  const errors = (
    <>
      {/* A grant started here fails into both; say it once. */}
      {autoLoginError && autoLoginError !== connectionError && <ErrorLine>{autoLoginError}</ErrorLine>}
      {connectionError && <ErrorLine>{connectionError}</ErrorLine>}
      {/* "Could not connect" on its own leaves nowhere to go. The doctor is
          the next step, so it appears exactly when that happens. */}
      {failure && (
        <ConnectionDoctorSheet
          label="Why can't I connect?"
          variant="ghost"
          context={{ kind: "discovery", endpointUrl: DEFAULT_COORDINATION_SERVER_URL }}
          buildTargets={() => endpointToProbeTargets(DEFAULT_COORDINATION_SERVER_URL)}
          originalError={failure}
          subject={DEFAULT_COORDINATION_SERVER_HOST}
        />
      )}
    </>
  );

  if (presentation === "hero") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3">
        <Button
          onClick={handleConnect}
          size="lg"
          disabled={isConnecting}
          className="h-auto w-full justify-center rounded-3xl py-3"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for approval in your browser…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Sign in with {DEFAULT_COORDINATION_SERVER_HOST}
            </>
          )}
        </Button>
        {waiting}
        {errors}
      </div>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleConnect}
            variant="outline"
            disabled={isConnecting}
            aria-label={label}
            className="flex h-auto w-32 flex-col items-center justify-start gap-2 rounded-3xl border-dashed px-3 py-4 text-muted-foreground"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed">
              {isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </span>
            <span className="w-full truncate text-sm font-normal">
              Add account
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isConnecting ? "Waiting for approval in your browser…" : label}
        </TooltipContent>
      </Tooltip>

      {/* `w-full` in the wrapping row means: on its own line, under the cards. */}
      <div className="flex w-full flex-col items-center gap-2 empty:hidden">
        {waiting}
        {errors}
      </div>
    </>
  );
};

const ErrorLine = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center gap-2 text-sm text-destructive">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span>{children}</span>
  </div>
);
