import { ReleaseNotes } from "@/core/updates/ReleaseNotesView";
import type { UpdateProblem } from "@/core/updates/updateErrors";
import {
  updateError as recordUpdateError,
  useUpdateState,
} from "@/core/updates/updateStore";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../../../core/components/ui/alert";
import { Button } from "../../../core/components/ui/button";
import { Progress } from "../../../core/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../core/components/ui/select";

type UpdateChannel = "latest" | "next";

/**
 * The update card on the settings page.
 *
 * Reads `app/updates/updateStore` rather than subscribing to the updater
 * itself. `UpdateListener` owns the one subscription, so this card and the rail
 * island can never disagree — opening settings mid-download used to show 0%
 * while a download was already half done, because each surface started its own
 * listener from zero.
 */
export const UpdateChecker: React.FC = () => {
  const {
    phase,
    version: updateVersion,
    releaseNotes,
    percent,
    status,
    problem,
  } = useUpdateState((state) => state);
  const error = phase === "error" ? problem : undefined;

  const isChecking = phase === "checking";
  const updateAvailable =
    phase === "available" || phase === "downloading" || phase === "downloaded";
  const checkComplete = phase !== "idle" && phase !== "checking";

  // Page-local: whether the user has waved the result away. Reset by a new check.
  const [alertDismissed, setAlertDismissed] = useState(false);
  const showAlert =
    !alertDismissed &&
    (phase === "available" ||
      phase === "downloaded" ||
      phase === "none" ||
      phase === "pending" ||
      phase === "error");

  const [channel, setChannel] = useState<UpdateChannel>("latest");
  const [version, setVersion] = useState<string>("");
  const [channelBusy, setChannelBusy] = useState(false);

  // Load the current channel + app version on mount
  useEffect(() => {
    if (!window.updates?.getChannel) return;
    window.updates
      .getChannel()
      .then((info) => {
        setChannel(info.channel);
        setVersion(info.version);
      })
      .catch(() => {});
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!window.updates) {
      recordUpdateError("Update system not available");
      return;
    }

    setAlertDismissed(false);

    try {
      const result = await window.updates.checkForUpdates();
      // On success the updater's own events drive the store.
      if (!result.success || result.error) {
        recordUpdateError({
          message: result.error ?? "Update check failed",
          code: result.code,
        });
      }
    } catch (error) {
      recordUpdateError(error);
    }
  }, []);

  const handleChannelChange = useCallback(
    async (value: UpdateChannel) => {
      if (!window.updates?.setChannel) return;
      const previous = channel;
      setChannel(value);
      setChannelBusy(true);
      setAlertDismissed(false);
      try {
        const result = await window.updates.setChannel(value);
        if (!result.success || result.error) {
          setChannel(previous);
          recordUpdateError({
            message: result.error || "Failed to switch update channel",
            code: result.code,
          });
        }
        // On success the updater's events report the check result.
      } catch (error) {
        setChannel(previous);
        recordUpdateError(error);
      } finally {
        setChannelBusy(false);
      }
    },
    [channel],
  );

  const dismissAlert = () => {
    setAlertDismissed(true);
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (phase === "pending") {
      return <Clock className="h-4 w-4" />;
    }
    if (updateAvailable) {
      return <Download className="h-4 w-4" />;
    }
    if (checkComplete) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isChecking) {
      return status || "Checking for updates...";
    }
    return "Check for Updates";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Update channel</span>
            {version && (
              <span className="text-xs text-muted-foreground">
                Current version: {version}
              </span>
            )}
          </div>
          <Select
            value={channel}
            onValueChange={(v) => handleChannelChange(v as UpdateChannel)}
            disabled={channelBusy || !window.updates?.setChannel}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Stable</SelectItem>
              <SelectItem value="next">Next</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {channel === "next" && (
          <p className="text-xs text-muted-foreground">
            Prereleases — may be unstable.
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={checkForUpdates}
          disabled={isChecking}
          variant="outline"
          className="flex items-center gap-2"
        >
          {getStatusIcon()}
          {getButtonText()}
        </Button>
      </div>

      {percent !== undefined && percent > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {phase === "downloaded"
              ? "Update downloaded — restart to install"
              : `Downloading update: ${Math.round(percent)}%`}
          </div>
          <Progress value={percent} />
        </div>
      )}

      {showAlert && (
        <Alert
          variant={error ? "destructive" : "default"}
          className="relative"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={dismissAlert}
          >
            <X className="h-4 w-4" />
          </Button>

          {problem && (phase === "error" || phase === "pending") && (
            <>
              {phase === "pending" ? (
                <Clock className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle className="pr-8">{problem.title}</AlertTitle>
              <AlertDescription>
                <p>{problem.message}</p>
                <ProblemDetail problem={problem} />
              </AlertDescription>
            </>
          )}

          {updateAvailable && (
            <>
              <Download className="h-4 w-4" />
              <AlertTitle className="pr-8">
                {phase === "downloaded"
                  ? `Version ${updateVersion} is ready`
                  : `Version ${updateVersion} is available`}
              </AlertTitle>
              <AlertDescription>
                <p>
                  {phase === "downloaded"
                    ? "Restart to install it, or it installs the next time you quit."
                    : "It downloads in the background."}
                </p>
                {phase === "downloaded" && (
                  <Button
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => void window.updates?.quitAndInstall()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restart now
                  </Button>
                )}
              </AlertDescription>
            </>
          )}

          {phase === "none" && (
            <>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle className="pr-8">You're up to date</AlertTitle>
              <AlertDescription>
                No updates are available at this time.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {updateAvailable && releaseNotes && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            What's new
          </div>
          <ReleaseNotes
            notes={releaseNotes}
            className="max-h-72 overflow-y-auto pr-2"
          />
        </div>
      )}
    </div>
  );
};

/**
 * The updater's own words, folded away: useful for a bug report, noise for
 * everyone else. Hidden when it would only repeat the message above it.
 */
const ProblemDetail = ({ problem }: { problem: UpdateProblem }) => {
  if (problem.detail.trim() === problem.message.trim()) return null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
        Details
      </summary>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 font-mono text-[11px]">
        {problem.detail}
      </pre>
    </details>
  );
};
