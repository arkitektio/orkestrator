import { structure } from "@/core/smart/structure";
import type { JSONObject, Structure } from "@/core/types";

/**
 * The one descriptor of `@rekuest/agent`: the app the agent says controls its
 * lifecycle (e.g. `plugin_engine`), self-declared on registration. A
 * supervisor's actions require it on their agent input, so an agent carries
 * it as a descriptor and the menu offers them only on the agents they
 * supervise. A hint, never authority: the supervisor checks before acting.
 */
export const SUPERVISOR_DESCRIPTOR = "@rekuest/supervisor";

type Supervised = { supervisor?: string | null };

export const agentDescriptors = (agent: Supervised): JSONObject | undefined =>
  agent.supervisor ? { [SUPERVISOR_DESCRIPTOR]: agent.supervisor } : undefined;

/** An agent as a Structure, with the descriptors actions match it by. */
export const agentStructure = (agent: Supervised & { id: string; name?: string | null }): Structure =>
  structure("@rekuest/agent", agent.id, { label: agent.name, descriptors: agentDescriptors(agent) });

/** The supervisor a structure names, when it is one agent that names one. */
export const supervisorOf = (item: Pick<Structure, "identifier" | "descriptors"> | undefined) => {
  const value = item?.identifier === "@rekuest/agent" ? item.descriptors?.[SUPERVISOR_DESCRIPTOR] : undefined;
  return typeof value === "string" && value ? value : undefined;
};
