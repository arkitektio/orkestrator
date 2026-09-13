import { NodeContextualParams } from "../../types";
import { useEditFlowStore } from "../context";
import { ContextualContainer } from "./ContextualContainer";
import { ConstantActionDocument, ConstantActionQuery, useAllActionsQuery, ListActionFragment } from "@/rekuest/api/graphql";
import { rekuestActionToMatchingNode } from "@/reaktion/plugins/rekuest";
import { useRekuest } from "@/app/Arkitekt";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const ActionSearch = ({ appIdentifier, onSelect }: { appIdentifier: string, onSelect: (impl: ListActionFragment) => void }) => {
  const { data } = useAllActionsQuery({
    variables: {
      filters: {
        appIdentifier: appIdentifier,
      },
    },
  });

  return (
    <Command className="w-[320px]">
      <CommandInput placeholder="Search implementations..." />
      <CommandList>
        <CommandEmpty>No implementations found.</CommandEmpty>
        <CommandGroup heading="Implementations">
          {data?.actions.map((action) => (
            <CommandItem key={action.id} onSelect={() => onSelect(action)}>
              {action.name} ({action.version})
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export const NodeContextual = (props: { params: NodeContextualParams }) => {
  const clearPanels = useEditFlowStore((s) => s.clearPanels);
  const addNode = useEditFlowStore((s) => s.addNode);
  const client = useRekuest();

  const handleImplementationSelect = (action: ListActionFragment) => {
    client &&
      client
        .query({
          query: ConstantActionDocument,
          variables: { id: action.id },
        })
        .then((event: { data?: ConstantActionQuery }) => {
          if (event.data?.action) {
            const flownode = rekuestActionToMatchingNode(event.data?.action, {
              x: 20,
              y: 50,
            });

            flownode.parentId = props.params.nodeId;
            flownode.extent = "parent";

            addNode(flownode);
            clearPanels();
          }
        });
  };

  return (
    <ContextualContainer
      active={true}
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
        minWidth: 320,
      }}
    >
      <ActionSearch
          appIdentifier={props.params.subFlowNode.data.appFilter ?? ""}
          onSelect={handleImplementationSelect}
        />
    </ContextualContainer>
  );
};
