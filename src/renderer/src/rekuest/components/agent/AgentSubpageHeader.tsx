import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import type { AgentLogoFragment } from "@/rekuest/api/graphql";
import { AgentLogo } from "@/rekuest/components/logo/BlokLogo";

/**
 * What a page about ONE agent's things (its tasks, its actions) opens with:
 * the list pages' header (tile, title, one sentence), with the agent's own
 * logo in the tile. An agent that declared none gets rekuest's icon.
 */
export const AgentSubpageHeader = ({
  agent,
  title,
  description,
}: {
  agent: AgentLogoFragment;
  title: React.ReactNode;
  description: React.ReactNode;
}) => (
  <ModuleHomeHeader
    moduleKey="rekuest"
    title={title}
    description={description}
    icon={agent.logo?.blok ? <AgentLogo agent={agent} className="size-full p-1.5" /> : undefined}
  />
);
