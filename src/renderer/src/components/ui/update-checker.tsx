import {
  updateError as recordUpdateError,
  useUpdateState,
} from "@/app/updates/updateStore";
import { AlertTriangle, CheckCircle, Download, RefreshCw, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";
import { Progress } from "./progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

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
  const { phase, version: updateVersion, releaseNotes, percent, status, error } =
    useUpdateState((state) => state);

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
        recordUpdateError(result.error ?? "Update check failed");
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
          recordUpdateError(result.error || "Failed to switch update channel");
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

          <div className="pr-8">
            {error && (
              <>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Update check failed:</strong> {error}
                </AlertDescription>
              </>
            )}

            {updateAvailable && !error && (
              <>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Update available:</strong> Version {updateVersion} is ready to download.
                  {releaseNotes && (
                    <div className="mt-2 text-sm">
                      <strong>Release Notes:</strong>
                      <div className="mt-1 max-h-32 overflow-y-auto text-xs">
                        {releaseNotes}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </>
            )}

            {checkComplete && !updateAvailable && !error && (
              <>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>You're up to date!</strong> No updates are available at this time.
                </AlertDescription>
              </>
            )}
          </div>
        </Alert>
      )}
    </div>
  );
};
