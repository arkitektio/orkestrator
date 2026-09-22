import { Arkitekt } from "@/app/Arkitekt";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DEFAULT_COORDINATION_SERVER_HOST,
  DEFAULT_COORDINATION_SERVER_URL,
} from "@/constants";
import { ConnectionDoctorSheet } from "@/app/components/doctor/ConnectionDoctor";
import { endpointToProbeTargets } from "@/lib/arkitekt/doctor/targets";
import { discover } from "@/lib/arkitekt/fakts/discover";
import { AlertCircle, Loader2, Plus } from "lucide-react";
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

  const handleConnect = async () => {
    const controller = new AbortController();

    try {
      setIsConnecting(true);
      setConnectionError(null);

      const endpoint = await discover({
        url: DEFAULT_COORDINATION_SERVER_URL,
        controller,
        timeout: 2000,
      });

      await connect({
        endpoint,
        controller,
      });
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionError(
        error instanceof Error ? error.message : "Unable to connect to the coordination server.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const label = `Add an account on ${DEFAULT_COORDINATION_SERVER_HOST}`;

  const failure = connectionError || autoLoginError;

  const errors = (
    <>
      {autoLoginError && <ErrorLine>{autoLoginError}</ErrorLine>}
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
