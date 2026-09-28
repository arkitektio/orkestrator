import { useRekuest } from "@/rekuest/api/hooks";
import { ListDefinitionFragment } from "@/kabinet/api/graphql";
import { useHashActionWithProgress } from "@/rekuest/hooks/useHashActionWithProgress";
import { Download } from "lucide-react";
import React from "react";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import { KabinetDefinition } from "@/core/linkers";

/** The Installable row; the section is a descriptor in `./sections.tsx`. */

export type InstallAction = {
  id: string;
  hash: string;
  name: string;
  description?: string | null;
};

export const InstallButton = (props: {
  definition: ListDefinitionFragment;
  action: InstallAction;
  children: React.ReactNode;
}) => {
  const client = useRekuest();
  const { assign, progress, installed } = useHashActionWithProgress({
    hash: props.action.hash,
    // Fired from the command palette, which closes on select: without this the
    // install runs on with no indicator anywhere.
    notifyGlobally: true,
    onDone: () => {
      void client.refetchQueries({ include: ["AllPrimaryActions"] });
    },
  });

  return (
    <CommandActionRow
      value={`install-${props.definition.id}-${props.action.id}`}
      onSelect={() => {
        void assign({ definition: {object: props.definition.id, __identifier: KabinetDefinition.identifier } });
      }}
      title={props.definition.name}
      description={props.definition.description}
      icon={Download}
      progress={progress}
      disabled={!installed}
    />
  );
};
