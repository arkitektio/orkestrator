import { useRekuest } from "@/app/Arkitekt";
import {
  DemandKind as KabinetDemandKind,
  ListDefinitionFragment,
  PortDemandInput as KabinetPortDemandInput,
  PortKind as KabinetPortKind,
  useAllPrimaryDefinitionsQuery,
} from "@/kabinet/api/graphql";
import {
  DemandKind,
  PortKind,
  useAllActionsQuery,
} from "@/rekuest/api/graphql";
import { useHashActionWithProgress } from "@/rekuest/hooks/useHashActionWithProgress";
import { CommandGroup } from "cmdk";
import { Download } from "lucide-react";
import React from "react";
import { CommandActionRow } from "../CommandActionRow";
import type { PassDownProps } from "../types";
import { KabinetDefinition } from "@/linkers";

type InstallAction = {
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

export const ApplicableDefinitions = (props: PassDownProps) => {
  const demands: KabinetPortDemandInput[] = [];

  if (props.objects.length === 1) {
    demands.push({
      kind: KabinetDemandKind.Args,
      matches: [{ at: 0, kind: KabinetPortKind.Structure, identifier: props.objects[0].identifier }],
    });
  }

  if (props.objects.length > 1) {
    demands.push({
      kind: KabinetDemandKind.Args,
      matches: [{
        at: 0,
        kind: KabinetPortKind.List,
        children: [{ at: 0, kind: KabinetPortKind.Structure, identifier: props.objects[0].identifier }],
      }],
    });
  }

  if (props.partners && props.partners.length === 1) {
    demands.push({
      kind: KabinetDemandKind.Args,
      matches: [{ at: 1, kind: KabinetPortKind.Structure, identifier: props.partners[0].identifier }],
    });
  }

  if (props.partners && props.partners.length > 1) {
    demands.push({
      kind: KabinetDemandKind.Args,
      matches: [{
        at: 1,
        kind: KabinetPortKind.List,
        children: [{ at: 1, kind: KabinetPortKind.Structure, identifier: props.partners[0].identifier }],
      }],
    });
  }

  const { data: enginesData } = useAllActionsQuery({
    variables: {
      filters: {
        demands: [
          {
            kind: DemandKind.Args,
            matches: [{ at: 0, kind: PortKind.Structure, identifier: "@kabinet/definition" }],
          },
          {
            kind: DemandKind.Returns,
            matches: [{ at: 0, kind: PortKind.Structure, identifier: "@kabinet/pod" }],
          },
        ],
      },
    },
    fetchPolicy: "cache-first",
  });

  const { data } = useAllPrimaryDefinitionsQuery({
    variables: {
      filters: {
        demands,
        search: props.filter && props.filter !== "" ? props.filter : undefined,
      },
    },
    fetchPolicy: "cache-and-network",
  });

  if (!data || data.definitions.length === 0) {
    return null;
  }

  if (!enginesData || enginesData.actions.length === 0) {
    return null;
  }

  return (
    <CommandGroup
      heading={
        <span className="font-light text-xs w-full items-center ml-2 w-full inline-flex gap-2">

          <span>Installable</span>
        </span>
      }
    >
      {data.definitions.map((definition) => (
        <React.Fragment key={definition.id}>
          {enginesData.actions.map((action) => (
            <InstallButton
              definition={definition}
              key={`${definition.id}-${action.id}`}
              action={action as InstallAction}
            >
              {definition.name}
            </InstallButton>
          ))}
        </React.Fragment>
      ))}
    </CommandGroup>
  );
};
