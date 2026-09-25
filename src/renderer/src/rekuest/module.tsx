import { TaskHookRunner } from "@/lib/taskhooks/TaskHookRunner";
import { defineModule } from "@/lib/module-host/define";
import { REKUEST_ACTIONS } from "./actions";
import { UiCatalogRegistrar } from "./catalog/UiCatalogRegistrar";
import { AgentUpdater } from "./components/functional/AgentUpdater";
import { TaskUpdater } from "./components/functional/TaskUpdater";
import ActionHoverCard from "./components/hovers/ActionHoverCard";
import AgentHoverCard from "./components/hovers/AgentHoverCard";
import ImplementationHoverCard from "./components/hovers/ImplementationHoverCard";
import TaskHoverCard from "./components/hovers/TaskHoverCard";
import { LatestTasksDashboardWidget } from "./dashboard/LatestTasksDashboardWidget";
import { RekuestDashboardWidgets } from "./dashboard/RekuestDashboardWidgets";
import { REKUEST_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { REKUEST_PROFILE_SECTIONS } from "./profile/sections";
import { RekuestEntitySearch } from "./search";
import { REKUEST_SECTIONS } from "./smart/sections";

export const REKUEST_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./RekuestNextModule"),
    nav: () => import("./panes/StandardPane"),
    hovers: {
      "@rekuest/action": ActionHoverCard,
      "@rekuest/agent": AgentHoverCard,
      "@rekuest/task": TaskHoverCard,
      "@rekuest/implementation": ImplementationHoverCard,
    },
    dialogs: REKUEST_DIALOGS,
    actions: REKUEST_ACTIONS,
    sections: REKUEST_SECTIONS,
    profileSections: REKUEST_PROFILE_SECTIONS,
    background: [
      TaskUpdater,
      AgentUpdater,
      UiCatalogRegistrar,
      RekuestDashboardWidgets,
      LatestTasksDashboardWidget,
      TaskHookRunner,
    ],
    search: RekuestEntitySearch,
  },
});
