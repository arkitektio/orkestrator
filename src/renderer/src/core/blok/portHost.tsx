import { configurePortHost } from "@arkitektio/bsx/ports/host";
import { useDialogError } from "@/core/dialogs/DialogError";
import { useServiceQuery } from "@/core/modules/hooks/useServiceQuery";
import { useOptionSourceHonoursRequires, useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { StructureViewer } from "@/core/smart/display/StructureViewer";
import { useDisplayComponent } from "@/core/smart/display/displays";
import { smartRegistry } from "@/core/smart/registry";

/**
 * What an action's form gets from this app (`@arkitektio/bsx/ports` asks once,
 * before the first render): each service's client, the modules' option sources
 * and displays, the smart registry's names, and the dialog scope a failed form
 * reports into. Imported by `core/blok/platform.ts`.
 */
configurePortHost({
  useServiceQuery,
  useStructureOptions: (identifier) => useStructureOptions(identifier),
  useOptionSourceHonoursRequires: (identifier) => useOptionSourceHonoursRequires(identifier),
  displayName: (identifier) => smartRegistry.getDisplayName(identifier),
  useDisplayComponent: (identifier) => useDisplayComponent(identifier),
  StructureDisplay,
  StructureViewer,
  useReportError: () => useDialogError().report,
});
