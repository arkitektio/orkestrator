import { createContext, useContext, useState, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon, LoaderIcon } from "lucide-react";

import { reportError } from "@/core/notify";
import { Button } from "@/core/ui/button";

import { useOptionalStagedLayersStoreApi, useStagedLayersStore } from "../../platform/float/stagedLayerStore";
import { StagingResultSink } from "./StagingResultSink";
import { useStaging, type StageSource } from "./useStaging";

const StagingOwnerContext = createContext<string | null>(null);

/** The float that owns what is staged below, or null outside one. */
export const useStagingOwner = () => useContext(StagingOwnerContext);

/**
 * A float's content: whatever it stages is owned by `owner`, the rows below
 * can stage what they list (`StageToggle`), and its actions' results are
 * staged rather than saved (`StagingResultSink`).
 */
export const FloatStagingScope = ({ owner, children }: { owner: string; children?: ReactNode }) => (
  <StagingOwnerContext.Provider value={owner}>
    <StagingResultSink owner={owner}>{children}</StagingResultSink>
  </StagingOwnerContext.Provider>
);

/**
 * Show a derivation in the scene for now: staged under the float that lists
 * it, discarded again on a second click. Renders nothing outside a float, or
 * outside a scene (a page listing the same derivations).
 */
export const StageToggle = ({ source }: { source: StageSource }) => {
  const owner = useStagingOwner();
  const stagedApi = useOptionalStagedLayersStoreApi();
  if (!owner || !stagedApi) return null;
  return <Toggle owner={owner} source={source} />;
};

const Toggle = ({ owner, source }: { owner: string; source: StageSource }) => {
  const { stage, discard } = useStaging();
  const staged = useStagedLayersStore((state) =>
    state.entries.find((entry) => entry.owner === owner && entry.source === source.lens),
  );
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const toggle = () => {
    if (staged) {
      discard([staged.key]);
      return;
    }
    setBusy(true);
    stage(owner, source)
      .then((result) => {
        if (result.status === "present") setRefusal("Already in the scene");
        if (result.status === "unplaceable") setRefusal("Cannot be placed in this scene");
      })
      .catch((error: unknown) => reportError(error, "Couldn't show it in the scene"))
      .finally(() => setBusy(false));
  };

  const label = staged ? "Remove from the scene" : refusal ?? "Show in the scene";
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="shrink-0"
      aria-label={label}
      aria-pressed={!!staged}
      title={label}
      disabled={busy || (!staged && refusal !== null)}
      onClick={toggle}
    >
      {busy ? <LoaderIcon className="animate-spin" /> : staged ? <EyeIcon /> : <EyeOffIcon />}
    </Button>
  );
};
