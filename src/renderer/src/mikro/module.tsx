import { defineModule } from "@/core/modules/host/define";
import { MIKRO_ACTIONS } from "./actions";
import ArrayDatasetHoverCard from "./components/hovers/ArrayDatasetHoverCard";
import ChartHoverCard from "./components/hovers/ChartHoverCard";
import FileHoverCard from "./components/hovers/FileHoverCard";
import FolderHoverCard from "./components/hovers/FolderHoverCard";
import { LatestArrayDatasetsDashboardWidget } from "./dashboard/LatestArrayDatasetsDashboardWidget";
import { MikroDashboardWidgets } from "./dashboard/MikroDashboardWidgets";
import { AnnotationDisplay } from "./displays/AnnotationDisplay";
import { ArrayDatasetDisplay } from "./displays/ArrayDatasetDisplay";
import { ChartDisplay } from "./displays/ChartDisplay";
import { FileDisplay } from "./displays/FileDisplay";
import { FolderDisplay } from "./displays/FolderDisplay";
import { LensDisplay } from "./displays/LensDisplay";
import { SceneDisplay } from "./displays/SceneDisplay";
import { SparseDatasetDisplay } from "./displays/SparseDatasetDisplay";
import { TableDatasetDisplay } from "./displays/TableDatasetDisplay";
import { MIKRO_FILE_DOWNLOADERS } from "./downloads";
import { MIKRO_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { MIKRO_OPTION_SOURCES } from "./options";
import { service } from "./service";
import { MIKRO_NAV_LINKS } from "./navLinks";
import { MIKRO_PROFILE_SECTIONS } from "./profile/sections";
import { MikroEntitySearch } from "./search";
import { ArrayDatasetViewer, SceneViewer } from "./viewers";

export const MIKRO_MODULE = defineModule({
  manifest,
  serviceKey: service.key,
  builtins: {
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
      "@mikro/lens": LensDisplay,
      "@mikro/chart": ChartDisplay,
    },
    viewers: {
      "@mikro/scene": SceneViewer,
      "@mikro/arraydataset": ArrayDatasetViewer,
    },
    hovers: {
      "@mikro/file": FileHoverCard,
      "@mikro/folder": FolderHoverCard,
      "@mikro/arraydataset": ArrayDatasetHoverCard,
      "@mikro/chart": ChartHoverCard,
    },
    dialogs: MIKRO_DIALOGS,
    actions: MIKRO_ACTIONS,
    optionSources: MIKRO_OPTION_SOURCES,
    profileSections: MIKRO_PROFILE_SECTIONS,
    background: [MikroDashboardWidgets, LatestArrayDatasetsDashboardWidget],
    search: MikroEntitySearch,
    fileDownloaders: MIKRO_FILE_DOWNLOADERS,
  },
});
