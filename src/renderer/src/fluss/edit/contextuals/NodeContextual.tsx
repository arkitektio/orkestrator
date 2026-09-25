import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NodeContextualParams } from "@/fluss/types";
import { useEditFlowStore, useEditNode } from "../context";
import { parentNode } from "../store/graph";
import { ContextualContainer } from "@/components/ui/contextual-container";
import { useActionNodeFactory } from "./subflow";
import { useActionSearch } from "./useActionSearch";

/** A subflow wrapper was clicked: add one of its app's actions inside it. */
export const NodeContextual = ({ params }: { params: NodeContextualParams }) => {
  const subflow = useEditNode(params.nodeId);
  const addNodes = useEditFlowStore((s) => s.addNodes);
  const { fetchAction } = useActionNodeFactory();
  const appFilter = (subflow?.data as { appFilter?: string | null } | undefined)?.appFilter ?? undefined;
  const { actions } = useActionSearch({ appIdentifier: appFilter, limit: 50 });

  const onSelect = async (actionId: string) => {
    if (!subflow) return;
    const fetched = await fetchAction(actionId, { x: 20, y: 50 });
    if (fetched) addNodes([parentNode(fetched.node, subflow.id, { x: 20, y: 50 })]);
  };

  if (!subflow) return null;

  return (
    <ContextualContainer active style={{ left: params.position.x, top: params.position.y, minWidth: 320 }}>
      <Command className="w-[320px]">
        <CommandInput placeholder="Search actions..." />
        <CommandList>
          <CommandEmpty>No actions found.</CommandEmpty>
          <CommandGroup heading={appFilter ? `Actions of ${appFilter}` : "Actions"}>
            {actions.map((action) => (
              <CommandItem key={action.id} onSelect={() => onSelect(action.id)}>
                {action.name} ({action.version})
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </ContextualContainer>
  );
};
