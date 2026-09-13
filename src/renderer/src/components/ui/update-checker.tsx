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

interface UpdateStatus {
  isChecking: boolean;
  updateAvailable: boolean;
  updateInfo?: any;
  progress?: number;
  error?: string;
  status?: string;
  checkComplete: boolean;
}

export const UpdateChecker: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    isChecking: false,
    updateAvailable: false,
    checkComplete: false,
  });

  const [showAlert, setShowAlert] = useState(false);
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

  // Set up event listeners for update events
  useEffect(() => {
    if (!window.updates) return;

    const handleStatus = (status: string) => {
      setUpdateStatus(prev => ({ ...prev, status, isChecking: true }));
    };

    const handleUpdateAvailable = (info: any) => {
      setUpdateStatus(prev => ({
        ...prev,
        updateAvailable: true,
        updateInfo: info,
        isChecking: false,
        checkComplete: true
      }));
      setShowAlert(true);
    };

    const handleUpdateNone = () => {
      setUpdateStatus(prev => ({
        ...prev,
        updateAvailable: false,
        isChecking: false,
        checkComplete: true,
        error: undefined
      }));
      setShowAlert(true);
    };

    const handleProgress = (progress: any) => {
      setUpdateStatus(prev => ({ ...prev, progress: progress.percent }));
    };

    const handleError = (error: any) => {
      setUpdateStatus(prev => ({
        ...prev,
        error: String(error),
        isChecking: false,
        checkComplete: true
      }));
      setShowAlert(true);
    };

    // Register event listeners; each returns its disposer.
    const disposers = [
      window.updates.onStatus(handleStatus),
      window.updates.onAvailable(handleUpdateAvailable),
      window.updates.onNone(handleUpdateNone),
      window.updates.onProgress(handleProgress),
      window.updates.onError(handleError),
    ];

    return () => {
      for (const dispose of disposers) {
        if (typeof dispose === "function") dispose();
      }
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!window.updates) {
      setUpdateStatus(prev => ({
        ...prev,
        error: "Update system not available",
        checkComplete: true
      }));
      setShowAlert(true);
      return;
    }

    setUpdateStatus(prev => ({
      ...prev,
      isChecking: true,
      error: undefined,
      checkComplete: false
    }));
    setShowAlert(false);

    try {
      const result = await window.updates.checkForUpdates();
      if (!result.success || result.error) {
        setUpdateStatus(prev => ({
          ...prev,
          error: result.error,
          isChecking: false,
          checkComplete: true
        }));
        setShowAlert(true);
      }
      // If successful, the event listeners will handle the response
    } catch (error) {
      setUpdateStatus(prev => ({
        ...prev,
        error: String(error),
        isChecking: false,
        checkComplete: true
      }));
      setShowAlert(true);
    }
  }, []);

  const handleChannelChange = useCallback(async (value: UpdateChannel) => {
    if (!window.updates?.setChannel) return;
    const previous = channel;
    setChannel(value);
    setChannelBusy(true);
    setUpdateStatus(prev => ({
      ...prev,
      isChecking: true,
      error: undefined,
      checkComplete: false,
    }));
    setShowAlert(false);
    try {
      const result = await window.updates.setChannel(value);
      if (!result.success || result.error) {
        setChannel(previous);
        setUpdateStatus(prev => ({
          ...prev,
          error: result.error || "Failed to switch update channel",
          isChecking: false,
          checkComplete: true,
        }));
        setShowAlert(true);
      }
      // On success the update event listeners report the check result.
    } catch (error) {
      setChannel(previous);
      setUpdateStatus(prev => ({
        ...prev,
        error: String(error),
        isChecking: false,
        checkComplete: true,
      }));
      setShowAlert(true);
    } finally {
      setChannelBusy(false);
    }
  }, [channel]);

  const dismissAlert = () => {
    setShowAlert(false);
  };

  const getStatusIcon = () => {
    if (updateStatus.isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (updateStatus.error) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (updateStatus.updateAvailable) {
      return <Download className="h-4 w-4" />;
    }
    if (updateStatus.checkComplete) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (updateStatus.isChecking) {
      return updateStatus.status || "Checking for updates...";
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
          disabled={updateStatus.isChecking}
          variant="outline"
          className="flex items-center gap-2"
        >
          {getStatusIcon()}
          {getButtonText()}
        </Button>
      </div>

      {updateStatus.progress !== undefined && updateStatus.progress > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Downloading update: {Math.round(updateStatus.progress)}%
          </div>
          <Progress value={updateStatus.progress} />
        </div>
      )}

      {showAlert && (
        <Alert
          variant={updateStatus.error ? "destructive" : "default"}
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
            {updateStatus.error && (
              <>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Update check failed:</strong> {updateStatus.error}
                </AlertDescription>
              </>
            )}

            {updateStatus.updateAvailable && updateStatus.updateInfo && (
              <>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Update available:</strong> Version {updateStatus.updateInfo.version} is ready to download.
                  {updateStatus.updateInfo.releaseNotes && (
                    <div className="mt-2 text-sm">
                      <strong>Release Notes:</strong>
                      <div className="mt-1 max-h-32 overflow-y-auto text-xs">
                        {updateStatus.updateInfo.releaseNotes}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </>
            )}

            {updateStatus.checkComplete && !updateStatus.updateAvailable && !updateStatus.error && (
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
