// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

// As the app does: install the modules before anything reads a registry.
import "@/app/modules/install";

import { registry as DIALOGS } from "@/core/dialogs/registry";
import { DISPLAY_REGISTRY } from "@/core/smart/display/displays";
import { registry as ACTIONS } from "@/core/smart/localactions/registry";
import { PROFILE_SECTIONS } from "@/core/connection/profile/registry";
import { SMART_SECTIONS } from "@/core/smart/smartcontext";
import { FILE_DOWNLOADERS } from "@/core/modules/registries";
import { TASK_HOOKS } from "@/core/modules/taskhooks/registry";

/**
 * What every host registry holds, pinned. The registries are derived from
 * the module list (`app/modules`); this is the guard that the derivation
 * neither drops nor invents an entry. It also evaluates the whole registry
 * import graph in one go, so an import cycle that reads a binding before it
 * is initialised fails here rather than at app start.
 *
 * Adding a dialog, display, action or section is adding it here too.
 */
describe("host registries", () => {
  it("hold every dialog", () => {
    expect(Object.keys(DIALOGS).sort()).toEqual([
      "actionassign",
      "addexperimentlayer",
      "addlayer",
      "addusertoorganization",
      "alpakareplyerassign",
      "calibrate",
      "chat",
      "commitmeshdesign",
      "createentity",
      "createentitycategory",
      "createentitywithproperties",
      "creategraph",
      "createmikrofolder",
      "createnaturaleventcategory",
      "createnewmeasurement",
      "createnewrelation",
      "createomeroarkcataset",
      "createorganization",
      "createproject",
      "createprotocoleventcategory",
      "createredeemtoken",
      "createrelationcategory",
      "createrepo",
      "createserviceinstance",
      "createshortcut",
      "createstructurerelationcategory",
      "createworkspace",
      "editentitycategory",
      "exporttofile",
      "implementationassign",
      "movetofolder",
      "neuroneditorhelp",
      "notifyusers",
      "placeexperimentlayer",
      "register",
      "relatestructure",
      "reportbug",
      "reportclientbug",
      "setasmeasurement",
      "updateagent",
      "updatefolder",
      "updateserviceinstance",
      "usemodelfor",
    ]);
  });

  it("hold every display", () => {
    expect(Object.keys(DISPLAY_REGISTRY).sort()).toEqual([
      "@alpaka/message",
      "@elektro/modelworkspace",
      "@elektro/neuronmodel",
      "@kabinet/pod",
      "@kraph/entity",
      "@kraph/entitycategory",
      "@kraph/graph",
      "@kraph/instance",
      "@kraph/link",
      "@kraph/measurement",
      "@kraph/metric",
      "@kraph/metrickind",
      "@kraph/naturalevent",
      "@kraph/naturaleventcategory",
      "@kraph/protocolevent",
      "@kraph/protocoleventcategory",
      "@kraph/relation",
      "@kraph/relationcategory",
      "@kraph/structure",
      "@kraph/structurekind",
      "@kraph/structurerelationcategory",
      "@kraph/term",
      "@lok/client",
      "@lok/device",
      "@lok/user",
      "@lovekit/solo_broadcast",
      "@mikro/arraydataset",
      "@mikro/file",
      "@mikro/folder",
      "@mikro/scene",
      "@mikro/sparsedataset",
      "@mikro/tabledataset",
    ]);
  });

  it("hold every local action", () => {
    expect(Object.keys(ACTIONS).sort()).toEqual([
      "add-layer-to-scene",
      "addElektroExperimentLayer",
      "add_user_to_organization",
      "alpaka-delete-provider",
      "alpaka-delete-room",
      "alpaka-rescan-provider",
      "attest-node",
      "calibrate-arrayDataset",
      "copylink",
      "copyprivatelink",
      "create-new-entity",
      "create-new-measurment-category",
      "create-protocol-event-category",
      "create-scene-from-arrayDataset",
      "create-scene-from-coordinatesystem",
      "createElektroWorkspaceFromModel",
      "delete-backend",
      "delete-kraph-entitycategory",
      "delete-kraph-graph",
      "delete-kraph-measurementcategory",
      "delete-kraph-naturaleventcategory",
      "delete-kraph-protocoleventcategory",
      "delete-mikro-arrayDataset",
      "delete-mikro-file",
      "delete-mikro-folder",
      "delete-mikro-scene",
      "delete-pod",
      "deleteElektroExperiment",
      "deleteElektroModelWorkspace",
      "deleteElektroNeuronModel",
      "exporttofile",
      "link-structure-to-entity",
      "move-arrayDataset-to-folder",
      "move-file-to-folder",
      "move_arrayDatasets_to_folder",
      "move_files_to_folder",
      "move_folders_to_folder",
      "move_tabledatasets_to_folder",
      "navigate",
      "newtab",
      "notify_user",
      "openElektroArrayDatasetOnTimeline",
      "opentotheside",
      "popout",
      "register-arrayDataset-into",
      "register-arrayDataset-into-coordinatesystem",
      "register-into-coordinatesystem",
      "register-scene-interactively",
      "register-tabledataset-into-coordinatesystem",
      "rekuest-assign-action",
      "rekuest-block-agent",
      "rekuest-bounce-agent",
      "rekuest-cleanup-action",
      "rekuest-copy-action-hash",
      "rekuest-create-shortcut-from-action",
      "rekuest-create-shortcut-from-implementation",
      "rekuest-delete-agent",
      "rekuest-delete-blok",
      "rekuest-delete-dashboard",
      "rekuest-delete-materialized-blok",
      "rekuest-delete-placement",
      "rekuest-delete-shortcut",
      "rekuest-delete-space",
      "rekuest-kick-agent",
      "rekuest-pin-agent",
      "rekuest-unblock-agent",
      "rekuest-update-agent",
      "rescan-repo",
      "retract-entity",
      "retract-links",
      "same-datum",
      "update-mikro-folder",
    ]);
  });

  it("hold every smart context section, in menu order", () => {
    expect(SMART_SECTIONS.sections.map((section) => section.id)).toEqual([
      "local.actions",
      "alpaka.talk",
      "rekuest.shortcuts",
      "kraph.measurements",
      "kraph.entityRelations",
      "kraph.structureRelations",
      "rekuest.actions",
      "rekuest.implementations",
      "rekuest.batchActions",
      "rekuest.batchImplementations",
      "kabinet.definitions",
    ]);
  });

  it("hold every profile section, in page order", () => {
    expect(PROFILE_SECTIONS.sections.map((section) => section.id)).toEqual([
      "mikro.latest-images",
      "mikro.recent-files",
      "rekuest.agents",
      "elektro.experiments",
      "elektro.models",
    ]);
  });

  it("hold every task hook and file downloader", () => {
    expect(Object.keys(TASK_HOOKS).sort()).toEqual([
      "elektro.download",
      "file.download",
    ]);
    expect(Object.keys(FILE_DOWNLOADERS).sort()).toEqual([
      "@elektro/file",
      "@mikro/file",
    ]);
  });
});
