import { describeMesh, describeSessionStep, meshIsStuck, meshIsWorking, sessionSteps } from "@/core/connection/progress/describe";
import type { MeshProgress, SessionProgress } from "@/core/connection/progress/store";
import type { ReactNode } from "react";
import type { Step } from "./ConnectionSteps";

/**
 * A bring-up as rows: the steps of its kind, the ones behind it ticked, the
 * running one spinning, the rest still to come — and the mesh under them
 * while it is being brought up for this session. `actions` puts something at
 * the end of a step's row (the browser's "Open again" on `approve`).
 */
export const sessionStepRows = ({
  session,
  mesh,
  actions = {},
}: {
  session: SessionProgress;
  mesh?: MeshProgress;
  actions?: Partial<Record<SessionProgress["step"], ReactNode>>;
}): Step[] => {
  const order = sessionSteps(session.kind);
  const current = order.indexOf(session.step);
  const rows: Step[] = order.map((step, index) => ({
    id: step,
    label: describeSessionStep(step, session),
    state: index < current ? "done" : index === current ? "working" : "pending",
    since: index === current ? session.stepSince : undefined,
    action: index === current ? actions[step] : undefined,
  }));

  if (mesh && (meshIsWorking(mesh.phase) || meshIsStuck(mesh.phase))) {
    rows.push({
      id: "mesh",
      label: describeMesh(mesh),
      state: meshIsStuck(mesh.phase) ? "waiting" : "working",
      since: mesh.since,
    });
  }
  return rows;
};
