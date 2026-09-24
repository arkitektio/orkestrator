import { Button } from "@/components/ui/button";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import {
  RailIsland,
  RailIslandName,
  RailIslandProgress,
  RailIslandRow,
} from "../components/rail/RailIsland";
import { dismissUpdate, useUpdateState } from "./updateStore";

/**
 * An app update downloading, ready, or failed — one row in the rail.
 *
 * Deliberately silent for `checking`, `available` and `pending` (a release
 * whose builds are still uploading — main re-checks by itself): the check is background
 * noise nobody asked for, and with `autoDownload` on, "available" becomes
 * "downloading" within a tick. What the user needs to know is that something is
 * being fetched, and that a restart is now worth it.
 *
 * This row replaces the native "Restart now / Later" modal the main process used
 * to open on completion. Ignoring it is safe: `autoInstallOnAppQuit` installs on
 * the next quit either way.
 */
export const UpdateIsland = () => {
  const { phase, version, percent, error, problem, dismissed } =
    useUpdateState((state) => state);

  const show =
    !dismissed &&
    (phase === "downloading" || phase === "downloaded" || phase === "error");
  const label = version ? `Update ${version}` : "Update";

  return (
    <RailIsland
      show={show}
      islandKey="update-island"
      testId="update-island"
      // Never more than one row, so it does not need a third of the rail.
      maxHeightClassName="max-h-[14vh]"
    >
      <RailIslandRow
        key={phase}
        working={phase === "downloading"}
        testId="update-island-row"
      >
        <div className="relative flex min-w-0 items-center gap-2">
          {phase === "error" ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          ) : (
            <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}

          <RailIslandName
            name={
              phase === "downloaded"
                ? `${label} ready`
                : phase === "error"
                  ? (problem?.title ?? "Update failed")
                  : label
            }
            working={phase === "downloading"}
          />

          {phase === "downloading" && percent != null && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {percent.toFixed(0)}%
            </span>
          )}

          {phase === "downloaded" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 shrink-0 gap-1 px-1.5 text-[10px]"
              onClick={() => void window.updates?.quitAndInstall()}
              title="Restart to install the update"
            >
              <RefreshCw className="h-3 w-3" />
              Restart
            </Button>
          )}
        </div>

        {phase === "downloading" && (
          <RailIslandProgress
            progress={percent ?? 0}
            started={(percent ?? 0) > 0}
          />
        )}

        {phase === "error" && error && (
          <p className="relative mt-1 line-clamp-2 break-words text-[11px] leading-snug text-destructive">
            {error}
          </p>
        )}

        {(phase === "downloaded" || phase === "error") && (
          <button
            type="button"
            onClick={dismissUpdate}
            className="relative mt-1 text-left text-[10px] text-muted-foreground hover:text-foreground"
          >
            {phase === "downloaded" ? "Install on next quit" : "Dismiss"}
          </button>
        )}
      </RailIslandRow>
    </RailIsland>
  );
};
