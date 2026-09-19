import type { ApolloClient, NormalizedCache } from "@apollo/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useElektro } from "@/app/Arkitekt";
import { ElektroExperiment } from "@/linkers";
import { findOrCreateExperimentForWorld } from "./openOnTimeline";

/**
 * Open a session's clock on a timeline: the experiment whose world is that
 * clock, staged if none exists yet (`findOrCreateExperimentForWorld`). Shared by
 * the model's session cards and a section's "Recorded in" rows.
 */
export const useOpenClockOnTimeline = () => {
  const client = useElektro() as ApolloClient<NormalizedCache> | undefined;
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const open = async (clock: { id: string; name: string }) => {
    if (!client) return;
    setOpening(true);
    try {
      const id = await findOrCreateExperimentForWorld(client, clock.id, clock.name);
      navigate(ElektroExperiment.linkBuilder(id));
    } catch (error) {
      toast.error(
        `Could not open the run on a timeline: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setOpening(false);
    }
  };

  return { open, opening, ready: !!client };
};
