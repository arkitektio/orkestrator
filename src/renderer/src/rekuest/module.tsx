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
import { ActionDisplay } from "./displays/ActionDisplay";
import { AgentDisplay } from "./displays/AgentDisplay";
import { BlokDisplay } from "./displays/BlokDisplay";
import { DashboardDisplay } from "./displays/DashboardDisplay";
import { DependencyDisplay } from "./displays/DependencyDisplay";
import { ImplementationDisplay } from "./displays/ImplementationDisplay";
import { InterfaceDisplay } from "./displays/InterfaceDisplay";
import { MaterializedBlokDisplay } from "./displays/MaterializedBlokDisplay";
import { MemoryShelveDisplay } from "./displays/MemoryShelveDisplay";
import { ResolutionDisplay } from "./displays/ResolutionDisplay";
import { ScheduleDisplay } from "./displays/ScheduleDisplay";
import { ShortcutDisplay } from "./displays/ShortcutDisplay";
import { SpaceDisplay } from "./displays/SpaceDisplay";
import { StateDisplay } from "./displays/StateDisplay";
import { StructureDisplay } from "./displays/StructureDisplay";
import { StructurePackageDisplay } from "./displays/StructurePackageDisplay";
import { TaskDisplay } from "./displays/TaskDisplay";
import { ToolboxDisplay } from "./displays/ToolboxDisplay";
import { TriggerDisplay } from "./displays/TriggerDisplay";
import { manifest } from "./manifest";
import { service } from "./service";
import { REKUEST_NAV_LINKS } from "./navLinks";
import { REKUEST_PROFILE_SECTIONS } from "./profile/sections";
import { RekuestEntitySearch } from "./search";
import { ClientFailedTasks } from "./sections/ClientFailedTasks";
import { DeviceAgents } from "./sections/DeviceAgents";
import { BackendAgents, PodActions } from "./sections/KabinetAgents";
import { RunOnSubmenu } from "./smart/RunOnSubmenu";
import { REKUEST_SECTIONS } from "./smart/sections";

export const REKUEST_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./RekuestNextModule"),
    navLinks: REKUEST_NAV_LINKS,
    displays: {
      "@rekuest/task": TaskDisplay,
      "@rekuest/action": ActionDisplay,
      "@rekuest/agent": AgentDisplay,
      "@rekuest/implementation": ImplementationDisplay,
      "@rekuest/schedule": ScheduleDisplay,
      "@rekuest/trigger": TriggerDisplay,
      "@rekuest/shortcut": ShortcutDisplay,
      "@rekuest/state": StateDisplay,
      "@rekuest/dependency": DependencyDisplay,
      "@rekuest/resolution": ResolutionDisplay,
      "@rekuest/memoryshelve": MemoryShelveDisplay,
      "@rekuest/toolbox": ToolboxDisplay,
      "@rekuest/blok": BlokDisplay,
      "@rekuest/materialized_blok": MaterializedBlokDisplay,
      "@rekuest/dashboard": DashboardDisplay,
      "@rekuest/space": SpaceDisplay,
      "@rekuest/structure": StructureDisplay,
      "@rekuest/interface": InterfaceDisplay,
      "@rekuest/structurepackage": StructurePackageDisplay,
    },
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
