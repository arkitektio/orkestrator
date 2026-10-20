import { describeFailure, describeMesh, meshIsStuck } from "@/core/connection/progress/describe";
import type { MeshProgress, ServiceProgress } from "@/core/connection/progress/store";
import type { ReactNode } from "react";
import type { Step } from "./ConnectionSteps";

/**
 * A service check as rows: every address tried (and how it went), then the
 * mesh while the check waits on it. `meshAction` is the way to the mesh's
 * settings, put on the mesh row when it is stuck there.
 */
export const serviceSteps = ({
  progress,
  mesh,
  meshAction,
}: {
  progress: ServiceProgress | undefined;
  mesh: MeshProgress | undefined;
  meshAction?: ReactNode;
}): Step[] => {
  if (!progress) return [];
  const steps: Step[] = progress.attempts.map((attempt, index) => ({
    id: `${index}:${attempt.host}`,
    label: (
      <>
        <span className="font-mono text-xs">{attempt.host}</span>
        {attempt.route === "mesh" && <span className="text-muted-foreground"> · through the mesh</span>}
      </>
    ),
    state: attempt.state === "trying" ? "working" : attempt.state === "ok" ? "done" : "failed",
    detail: attempt.state === "failed" ? describeFailure(attempt.failure) : undefined,
    since: attempt.state === "trying" ? attempt.at : undefined,
  }));

  if (progress.waitingForMesh) {
    const stuck = !!mesh && meshIsStuck(mesh.phase);
    steps.push({
      id: "mesh",
      label: mesh ? describeMesh(mesh) : "Waiting for the mesh",
      state: stuck ? "waiting" : "working",
      detail: "The other addresses of this service are only reachable through your organisation's mesh.",
      action: stuck ? meshAction : undefined,
      since: mesh?.since ?? progress.startedAt,
    });
  }
  return steps;
};
