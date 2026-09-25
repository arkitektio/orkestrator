import { defineModule } from "@/core/lib/module-host/define";
import { ELEKTRO_ACTIONS } from "./actions";
import ElektroArrayDatasetHoverCard from "./components/hovers/ArrayDatasetHoverCard";
import ExperimentHoverCard from "./components/hovers/ExperimentHoverCard";
import NeuronModelHoverCard from "./components/hovers/NeuronModelHoverCard";
import { ModelWorkspaceDisplay } from "./displays/ModelWorkspaceDisplay";
import { NeuronModelDisplay } from "./displays/NeuronModelDisplay";
import { ELEKTRO_FILE_DOWNLOADERS } from "./downloads";
import { ELEKTRO_TASK_HOOKS } from "./hooks/taskHooks";
import { ELEKTRO_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { service } from "./service";
import { ELEKTRO_NAV_LINKS } from "./navLinks";
import { ELEKTRO_PROFILE_SECTIONS } from "./profile/sections";

export const ELEKTRO_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    page: () => import("./ElektroModule"),
    nav: () => import("./panes/StandardPane"),
    navLinks: ELEKTRO_NAV_LINKS,
    displays: {
      "@elektro/neuronmodel": NeuronModelDisplay,
      "@elektro/modelworkspace": ModelWorkspaceDisplay,
    },
    hovers: {
      "@elektro/neuronmodel": NeuronModelHoverCard,
      "@elektro/arraydataset": ElektroArrayDatasetHoverCard,
      "@elektro/experiment": ExperimentHoverCard,
    },
    dialogs: ELEKTRO_DIALOGS,
    actions: ELEKTRO_ACTIONS,
    profileSections: ELEKTRO_PROFILE_SECTIONS,
    taskHooks: ELEKTRO_TASK_HOOKS,
    fileDownloaders: ELEKTRO_FILE_DOWNLOADERS,
  },
});
