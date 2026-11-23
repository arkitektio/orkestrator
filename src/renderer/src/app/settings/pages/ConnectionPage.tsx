import { ModuleStatusCards } from "@/core/modules/registries";
import { AgentStatusCard } from "../components/AgentStatusCard";
import { SettingsPage } from "../components/SettingsPage";

/**
 * Whether this window's live connections are up: the agent, then each module's (rekuest:
 * the session that carries live task and state updates). The footer's indicators link here.
 */
export const ConnectionPage = () => (
  <SettingsPage slug="connection">
    <AgentStatusCard />
    <ModuleStatusCards />
  </SettingsPage>
);

export default ConnectionPage;
