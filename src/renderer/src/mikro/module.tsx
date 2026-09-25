import { defineModule } from "@/lib/module-host/define";
import { MIKRO_ACTIONS } from "./actions";
import ArrayDatasetHoverCard from "./components/hovers/ArrayDatasetHoverCard";
import FileHoverCard from "./components/hovers/FileHoverCard";
import FolderHoverCard from "./components/hovers/FolderHoverCard";
import { LatestArrayDatasetsDashboardWidget } from "./dashboard/LatestArrayDatasetsDashboardWidget";
import { MikroDashboardWidgets } from "./dashboard/MikroDashboardWidgets";
import { ArrayDatasetDisplay } from "./displays/ArrayDatasetDisplay";
import { FileDisplay } from "./displays/FileDisplay";
import { FolderDisplay } from "./displays/FolderDisplay";
import { SceneDisplay } from "./displays/SceneDisplay";
import { SparseDatasetDisplay } from "./displays/SparseDatasetDisplay";
import { TableDatasetDisplay } from "./displays/TableDatasetDisplay";
import { MIKRO_FILE_DOWNLOADERS } from "./downloads";
import { MIKRO_DIALOGS } from "./dialogRegistry";
import { manifest } from "./manifest";
import { MIKRO_PROFILE_SECTIONS } from "./profile/sections";
import { MikroEntitySearch } from "./search";

export const MIKRO_MODULE = defineModule({
  manifest,
  builtins: {
    page: () => import("./MikroNextModule"),
    nav: () => import("./panes/StandardPane"),
    displays: {
      "@mikro/file": FileDisplay,
      "@mikro/scene": SceneDisplay,
      "@mikro/arraydataset": ArrayDatasetDisplay,
      "@mikro/folder": FolderDisplay,
      "@mikro/tabledataset": TableDatasetDisplay,
      "@mikro/sparsedataset": SparseDatasetDisplay,
    },
    hovers: {
      "@mikro/file": FileHoverCard,
      "@mikro/folder": FolderHoverCard,
      "@mikro/arraydataset": ArrayDatasetHoverCard,
    },
    dialogs: MIKRO_DIALOGS,
    actions: MIKRO_ACTIONS,
    profileSections: MIKRO_PROFILE_SECTIONS,
    background: [MikroDashboardWidgets, LatestArrayDatasetsDashboardWidget],
    search: MikroEntitySearch,
    fileDownloaders: MIKRO_FILE_DOWNLOADERS,
  },
});
