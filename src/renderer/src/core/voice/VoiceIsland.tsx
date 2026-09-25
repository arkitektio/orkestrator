import {
  RailIsland,
  RailIslandName,
  RailIslandProgress,
  RailIslandRow,
} from "@/core/ui/rail/RailIsland";
import { useSettings } from "@/core/settings/store/SettingsContext";
import { AlertCircle, Mic } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import type { VoiceModelProgress } from "../../../../main/voice/protocol";
import { shouldShowVoiceIsland } from "./shouldShowVoiceIsland";
import { useVoiceState } from "./store";

/** Overall percent across a model's files, or undefined before any byte moved. */
export const overallPercent = (progress: VoiceModelProgress | undefined): number | undefined => {
  if (!progress || progress.fileCount === 0) return undefined;
  const within = progress.total > 0 ? Math.min(1, progress.loaded / progress.total) : 0;
  return ((progress.fileIndex + within) / progress.fileCount) * 100;
};

/**
 * A speech model downloading or loading, or an engine that failed — one row
 * in the rail, gone again once dictation is ready.
 */
export const VoiceIsland = () => {
  const { settings } = useSettings();
  const { status, modelId, error, progress } = useVoiceState(
    useShallow((state) => ({
      status: state.status,
      modelId: state.modelId,
      error: state.error,
      progress: state.progress,
    })),
  );

  const show = shouldShowVoiceIsland({ enabled: settings.voiceControl, status });
  const percent = overallPercent(progress);
  const working = status === "starting" || status === "downloading";

  return (
    <RailIsland
      show={show}
      islandKey="voice-island"
      testId="voice-island"
      maxHeightClassName="max-h-[14vh]"
    >
      <RailIslandRow key={status} working={working} testId="voice-island-row">
        <div className="relative flex min-w-0 items-center gap-2">
          {status === "error" ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          ) : (
            <Mic className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <RailIslandName
            name={
              status === "error"
                ? "Voice input failed"
                : status === "downloading"
                  ? `Downloading ${modelId ?? "speech model"}`
                  : "Loading speech model"
            }
            working={working}
          />
          {status === "downloading" && percent !== undefined && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {Math.round(percent)}%
            </span>
          )}
        </div>
        {status === "error" && error && (
          <p className="relative mt-1 line-clamp-3 break-words text-[11px] leading-snug text-muted-foreground">
            {error}
          </p>
        )}
        {working && (
          <RailIslandProgress
            progress={percent ?? 0}
            started={status === "downloading" && percent !== undefined}
          />
        )}
      </RailIslandRow>
    </RailIsland>
  );
};
