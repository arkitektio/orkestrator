import { DefinitionLogo } from "@/kabinet/components/logo/KabinetBlokLogo";
import { useDialog } from "@/core/dialogs/registry";
import {
  DefinitionReleaseDocument,
  DefinitionReleaseQuery,
  DefinitionReleaseQueryVariables,
  SmartDefinitionFragment,
} from "@/kabinet/api/graphql";
import { useKabinet } from "@/kabinet/api/hooks";
import { Download } from "lucide-react";
import React from "react";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";

/** The Installable row; the section is a descriptor in `./sections.tsx`. */

type DefinitionRelease = NonNullable<
  DefinitionReleaseQuery["definition"]
>["flavours"][number]["release"];

/**
 * The release that brings a definition: its flavours' release, the newest
 * version when it ships in several (a definition unchanged across versions
 * keeps its hash, so one row stands for all of them).
 */
export const newestRelease = (releases: readonly DefinitionRelease[]): DefinitionRelease | undefined =>
  releases.reduce<DefinitionRelease | undefined>(
    (newest, release) =>
      !newest || release.version.localeCompare(newest.version, undefined, { numeric: true }) > 0
        ? release
        : newest,
    undefined,
  );

/**
 * Opens the install dialog for the definition's release: it has you authorize
 * a deployer app to run it as you, then asks where to deploy it (the store's
 * `InstallButton` does the same). The menu lists slim definitions; which
 * release brings one is asked only when the row is chosen.
 */
export const InstallDefinitionRow = ({ definition }: { definition: SmartDefinitionFragment }) => {
  const client = useKabinet();
  const { openDialog } = useDialog();
  const [running, setRunning] = React.useState(false);
  const [failure, setFailure] = React.useState<{ title: string; detail?: string } | null>(null);

  const install = async () => {
    setRunning(true);
    setFailure(null);
    try {
      const { data } = await client.query<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>({
        query: DefinitionReleaseDocument,
        variables: { id: definition.id },
        fetchPolicy: "cache-first",
      });
      const release = newestRelease(
        data.definition.flavours.map((flavour) => flavour.release),
      );
      if (!release) {
        setFailure({ title: "No release brings this definition" });
        return;
      }
      openDialog("installrelease", { release: release.id }, { className: "max-w-xl" });
    } catch (error) {
      setFailure({
        title: "Could not find its release",
        detail: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <CommandActionRow
      value={`install-${definition.id}`}
      onSelect={() => void install()}
      title={definition.name}
      description={definition.description}
      icon={Download}
      leading={definition.logo ? <DefinitionLogo definition={definition} className="h-full w-full" /> : undefined}
      running={running}
      failure={failure}
    />
  );
};
