import { MIKRO_BLOKS } from "./bloks";
import { defineModule } from "@/core/modules/host/define";
import { HeldInMikro } from "./components/collaboration/HeldInMikro";
import { shareWorkflowOperation } from "@/core/collaborations/shareWorkflow";
import { ShareWorkflowDocument } from "./api/graphql";
import { MIKRO_ACTIONS } from "./actions";
import { HomeDatasets } from "./dashboard/HomeDatasets";
import { AnnotationDisplay } from "./displays/AnnotationDisplay";
import { ArrayDatasetDisplay } from "./displays/ArrayDatasetDisplay";
import { ChartDisplay } from "./displays/ChartDisplay";
import { MeshObjectDisplay } from "./displays/MeshObjectDisplay";
import { GridDisplay } from "./displays/GridDisplay";
import { FileDisplay } from "./displays/FileDisplay";
import { FolderDisplay } from "./displays/FolderDisplay";
import { LensDisplay } from "./displays/LensDisplay";
import { SceneDisplay } from "./displays/SceneDisplay";
import { SparseDatasetDisplay } from "./displays/SparseDatasetDisplay";
import { TableDatasetDisplay } from "./displays/TableDatasetDisplay";
import { MIKRO_FILE_DOWNLOADERS } from "./downloads";
import { MIKRO_DIALOGS } from "./dialogRegistry";
import { LENS_IDENTIFIERS } from "./lenses";
import { manifest } from "./manifest";
import { MIKRO_OPTION_SOURCES } from "./options";
import { service } from "./service";
import { MIKRO_NAV_LINKS } from "./navLinks";
import { MIKRO_PROFILE_FEED } from "./profile/feed";
import { MikroEntitySearch } from "./search";
import {
  ArrayDatasetViewer,
  ArrayLensViewer,
  MeshObjectViewer,
  SceneViewer,
  TableDatasetViewer,
  TableLensViewer,
} from "./viewers";


export const MIKRO_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
    // A workflow shared from rekuest asks every service for what it made (core/collaborations).
    operations: { "mikro.shareWorkflow": shareWorkflowOperation(service.key, ShareWorkflowDocument) },
    page: () => import("./MikroNextModule"),
    navLinks: MIKRO_NAV_LINKS,
    displays: {
      "@mikro/file": FileDisplay,
      "@mikro/scene": SceneDisplay,
      "@mikro/arraydataset": ArrayDatasetDisplay,
      "@mikro/folder": FolderDisplay,
      "@mikro/tabledataset": TableDatasetDisplay,
      "@mikro/sparsedataset": SparseDatasetDisplay,
      "@mikro/annotation": AnnotationDisplay,
      // One per kind of lens; the line draws whichever kind it is.
      ...Object.fromEntries(LENS_IDENTIFIERS.map((identifier) => [identifier, LensDisplay])),
      "@mikro/chart": ChartDisplay,
      "@mikro/meshobject": MeshObjectDisplay,
      "@mikro/grid": GridDisplay,
    },
    viewers: {
      "@mikro/scene": SceneViewer,
      "@mikro/arraydataset": ArrayDatasetViewer,
      "@mikro/arraylens": ArrayLensViewer,
      "@mikro/meshobject": MeshObjectViewer,
      "@mikro/tabledataset": TableDatasetViewer,
      "@mikro/tablelens": TableLensViewer,
    },
    // The scene as parts an app's blok composes (`mikro/bloks`).
    bloks: MIKRO_BLOKS,
    dialogs: MIKRO_DIALOGS,
    actions: MIKRO_ACTIONS,
    optionSources: MIKRO_OPTION_SOURCES,
    // Their data, in the profile's newest-first feed.
    profileFeed: MIKRO_PROFILE_FEED,
    pageSections: [
      {
        // The newest datasets on the home page.
        id: "mikro.homedatasets",
        title: "Latest datasets",
        placement: "main",
        slot: "home",
        priority: 40,
        match: { identifiers: ["@lok/user"] },
        Component: HomeDatasets,
      },
      {
        // What mikro holds of a collaboration, on lok's page of it (by its key).
        id: "mikro.collaborationcontents",
        title: "Mikro",
        placement: "main",
        match: { identifiers: ["@lok/collaboration"] },
        Component: HeldInMikro,
      },
    ],
    search: MikroEntitySearch,
    fileDownloaders: MIKRO_FILE_DOWNLOADERS,
  },
});
