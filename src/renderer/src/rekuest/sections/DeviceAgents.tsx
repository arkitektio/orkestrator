import type { Object } from "@/types";
import AgentList from "../components/lists/AgentList";

/**
 * The agents running on a compute device: rekuest's `main` section on
 * `@lok/device` pages. The page hands over the device's `nodeId`, which is
 * what rekuest records agents against.
 */
export const DeviceAgents = ({ object }: { identifier: string; object: Object }) =>
  typeof object.nodeId === "string" ? (
    <div className="p-3">
      <AgentList filters={{ deviceId: object.nodeId }} title="Agents running here" />
    </div>
  ) : null;
