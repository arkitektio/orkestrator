import { TaskHookRunner } from "@/core/modules/taskhooks/TaskHookRunner";
import { defineModule } from "@/core/modules/host/define";
import { REKUEST_ACTIONS } from "./actions";
import { UiCatalogRegistrar } from "./catalog/UiCatalogRegistrar";
import { EnhanceButton } from "./components/EnhanceButton";
import { AgentUpdater } from "./components/functional/AgentUpdater";
import { TaskUpdater } from "./components/functional/TaskUpdater";
import { TaskIsland } from "./components/global/TaskIsland";
import ActionHoverCard from "./components/hovers/ActionHoverCard";
import AgentHoverCard from "./components/hovers/AgentHoverCard";
import ImplementationHoverCard from "./components/hovers/ImplementationHoverCard";
import TaskHoverCard from "./components/hovers/TaskHoverCard";
import { LatestTasksDashboardWidget } from "./dashboard/LatestTasksDashboardWidget";
import { RekuestDashboardWidgets } from "./dashboard/RekuestDashboardWidgets";
import { REKUEST_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { REKUEST_NAV_LINKS } from "./navLinks";
import { REKUEST_PROFILE_SECTIONS } from "./profile/sections";
import { RekuestEntitySearch } from "./search";
import { ClientFailedTasks } from "./sections/ClientFailedTasks";
import { DeviceAgents } from "./sections/DeviceAgents";
import { BackendAgents, PodActions } from "./sections/KabinetAgents";
import { KabinetInstallCard, KabinetInstallMenu } from "./sections/KabinetInstall";
import { RunOnSubmenu } from "./smart/RunOnSubmenu";
import { REKUEST_SECTIONS } from "./smart/sections";

export const REKUEST_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./RekuestNextModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: REKUEST_NAV_LINKS,
    hovers: {
      "@rekuest/action": ActionHoverCard,
      "@rekuest/agent": AgentHoverCard,
      "@rekuest/task": TaskHoverCard,
      "@rekuest/implementation": ImplementationHoverCard,
    },
    dialogs: REKUEST_DIALOGS,
    actions: REKUEST_ACTIONS,
    pageSections: [
      {
        // Run the "enhance" collection's actions on a category (fill in its
        // description, image, ...).
        id: "rekuest.enhance",
        title: "Enhance",
        placement: "actions",
        match: { identifiers: ["@kraph/entitycategory", "@kraph/protocoleventcategory"] },
        Component: EnhanceButton,
      },
      {
        id: "rekuest.clientfailures",
        title: "Critical failures",
        placement: "main",
        match: { identifiers: ["@lok/client"] },
        Component: ClientFailedTasks,
      },
      {
        id: "rekuest.deviceagents",
        title: "Agents running here",
        placement: "main",
        match: { identifiers: ["@lok/device"] },
        Component: DeviceAgents,
      },
      {
        // kabinet: install a flavour/release through an installer agent.
        id: "rekuest.kabinetinstall",
        title: "Install",
        placement: "card",
        match: { identifiers: ["@kabinet/flavour", "@kabinet/release"] },
        Component: KabinetInstallCard,
      },
      {
        id: "rekuest.kabinetinstallmenu",
        title: "Install",
        placement: "menu",
        match: { identifiers: ["@kabinet/flavour"] },
        Component: KabinetInstallMenu,
      },
      {
        id: "rekuest.backendagents",
        title: "Agents",
        placement: "actions",
        match: { identifiers: ["@kabinet/backend"] },
        Component: BackendAgents,
      },
      {
        id: "rekuest.podactions",
        title: "Pod actions",
        placement: "actions",
        match: { identifiers: ["@kabinet/pod"] },
        Component: PodActions,
      },
    ],
    sections: REKUEST_SECTIONS,
    // One "Run on" picker per menu, around (not inside) its command list.
    menuWrappers: [RunOnSubmenu],
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
    railIslands: [TaskIsland],
  },
});
