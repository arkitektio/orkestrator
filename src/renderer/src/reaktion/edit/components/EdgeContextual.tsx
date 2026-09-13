import { useRekuest } from "@/app/Arkitekt";
import { GraphQLSearchField } from "@/components/fields/GraphQLSearchField";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ReactiveImplementation } from "@/reaktion/api/graphql";
import { rekuestActionToMatchingNode } from "@/reaktion/plugins/rekuest";
import { reactiveFlowNode } from "@/reaktion/utils";
import {
  ConstantActionDocument,
  ConstantActionQuery,
  DemandKind,
  useAllActionsQuery,
  useProtocolOptionsLazyQuery
} from "@/rekuest/api/graphql";
import { ArrowDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  DropContextualParams,
  EdgeContextualParams,
  PortKind,
  ReactiveNodeSuggestions,
  StreamPort,
} from "../../types";
import { useEditFlowStore } from "../context";
import { ContextualContainer } from "./ContextualContainer";

export const SearchForm = (props: { onSubmit: (data: any) => void }) => {
  const form = useForm({
    defaultValues: {
      protocol: undefined,
      search: undefined,
    },
  });

  const {
    formState,
    formState: { isValidating },
    watch,
  } = form;

  const formdata = watch();

  console.log("Rendering", formdata);

  useEffect(() => {
    console.log(formState.isValid, isValidating);
    if (formState.isValid && !isValidating) {
      console.log("submiting", formdata);
      props.onSubmit(formdata);
    }
  }, [formState, formdata, isValidating]);

  const [searchProtocol] = useProtocolOptionsLazyQuery();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)} className="">
        <div className="w-full">
          <Popover>
            <FormField
              control={form.control}
              name={"search"}
              render={({ field }) => (
                <PopoverAnchor asChild>
                  <FormItem className="h-full  w-full relative flex-row flex relative">
                    <FormControl>
                      <Input
                        placeholder={"Search...."}
                        autoFocus
                        autoComplete="off"
                        {...field}
                        type="string"
                        className="flex-grow h-full bg-background text-foreground w-full"
                      />
                    </FormControl>

                    <PopoverTrigger className="absolute right-1 text-foreground text-sm">
                      <ArrowDown className="w-4 h-4" />
                    </PopoverTrigger>
                  </FormItem>
                </PopoverAnchor>
              )}
            />
            <PopoverContent>
              <div className="flex flex-row gap-2">
                <div className="col-span-2">
                  <GraphQLSearchField
                    name="protocol"
                    label="Protocol"
                    searchQuery={searchProtocol}
                    placeholder="Filter"
                    description="Filter by protocol"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </form>
    </Form>
  );
};

export const allandone = <T extends any>(
  left: T[],
  right: T[],
  predicate: (l: T, r: T) => boolean,
) => {
  return (
    left.every((l) => right.some((r) => predicate(l, r))) &&
    left.length == right.length &&
    right.length > 0
  );
};

function isMatch(item1: StreamPort, item2: StreamPort): boolean {
  return (
    item1.kind === item2.kind &&
    (item1.kind !== PortKind.Structure || item1.identifier === item2.identifier)
  );
}

function findMappings(
  list1: StreamPort[],
  list2: StreamPort[],
  index1 = 0,
  currentMapping: Map<number, number> = new Map(),
  allMappings: Map<number, number>[] = [],
): void {
  if (index1 === list1.length) {
    // If we've processed all items in list1, store the current mapping clone
    allMappings.push(new Map(currentMapping));
    return;
  }

  for (let index2 = 0; index2 < list2.length; index2++) {
    // If item at index2 in list2 is not already mapped and items match
    if (
      !Array.from(currentMapping.values()).includes(index2) &&
      isMatch(list1[index1], list2[index2])
    ) {
      currentMapping.set(index1, index2);
      findMappings(list1, list2, index1 + 1, currentMapping, allMappings);
      currentMapping.delete(index1); // Backtrack
    }
  }
}

function generateAllMappings(
  list1: StreamPort[],
  list2: StreamPort[],
): { [key: number]: number }[] {
  const allMappings: Map<number, number>[] = [];
  if (list1.length !== list2.length) return [];
  findMappings(list1, list2, 0, new Map(), allMappings);
  return allMappings.map((mapping) => Object.fromEntries(mapping.entries()));
}

//

const edgeReactiveNodes = (
  leftPorts: StreamPort[],
  rightPorts: StreamPort[],
  search: string = "",
): ReactiveNodeSuggestions[] => {
  const suggestions: ReactiveNodeSuggestions[] = [];

  if (!leftPorts || !rightPorts) {
    return [];
  }

  if (
    allandone(leftPorts, rightPorts, (port) => port.kind === PortKind.Float)
  ) {
    suggestions.push({
      node: reactiveFlowNode({
        title: "Round",
        description: "Round an Float to an Int",
        ins: [leftPorts],
        outs: [
          rightPorts.map((p) => ({
            ...p,
            key: "Rounded" + p.key,
            kind: PortKind.Int,
          })),
        ],
        implementation: ReactiveImplementation.ToList,
      }),
      title: "Round",
      description: "Round an Float to an Int",
    });
  }

  if (
    allandone(
      leftPorts,
      rightPorts,
      (port) => port.kind === PortKind.Int || port.kind === PortKind.Float,
    )
  ) {
    const isInt = !isNaN(parseInt(search));

    if (isInt) {
      suggestions.push({
        node: reactiveFlowNode({
          title: "Add",
          description: "Add an Int",
          ins: [leftPorts],
          constantsMap: { value: parseInt(search) },
          outs: [
            rightPorts.map((p) => ({
              ...p,
              key: "Added" + p.key,
              kind: PortKind.Int,
            })),
          ],
          implementation: ReactiveImplementation.Add,
        }),
        title: `Add ${search} (Int)`,
        description: "Add an Number",
      });
    }
  }

  if (rightPorts.length == 0) {
    suggestions.push({
      node: reactiveFlowNode({
        title: "Omit",
        description: "Discard the stream an just send an event",
        ins: [leftPorts],
        outs: [[]],
        implementation: ReactiveImplementation.Omit,
      }),
      title: "Omit",
      description: "Discard the stream an just send an event",
    });
  }

  for (const mapping of generateAllMappings(leftPorts, rightPorts)) {
    suggestions.push({
      node: reactiveFlowNode({
        title: "Reorder",
        description: "Reorder the stream",
        ins: [leftPorts],
        constantsMap: { map: mapping },
        outs: [rightPorts],
        implementation: ReactiveImplementation.Reorder,
      }),
      title: "Reorder",
      description: "Reorder the stream",
    });
  }

  return suggestions;
};

export const useEdgeReactiveNodes = (
  search: string | undefined,
  params: EdgeContextualParams,
) => {
  const leftPorts = params.leftNode.data.outs[params.leftStream];
  const rightPorts = params.rightNode.data.ins[params.rightStream];

  return useMemo(
    () => edgeReactiveNodes(leftPorts, rightPorts, search),
    [search],
  );
};

const displayLimit = 5;

export const EdgeContextualRekuestNode = (props: {
  params: EdgeContextualParams;
  search: undefined | string;
}) => {
  const leftPorts = props.params.leftNode.data.outs[props.params.leftStream];
  const rightPorts = props.params.rightNode.data.ins[props.params.rightStream];

  const { data, refetch, variables } = useAllActionsQuery({
    variables: {
      filters: {
        demands: [
          {
            kind: DemandKind.Args,
            matches:
              leftPorts.map((port, index) => ({
                at: index,
                kind: port.kind,
                identifier: port.identifier,
              })) || [],
            forceNonNullableLength: leftPorts.length || 0,
          },
          {
            kind: DemandKind.Returns,
            matches:
              rightPorts.map((port, index) => ({
                at: index,
                kind: port.kind,
                identifier: port.identifier,
              })) || [],
            forceNonNullableLength: rightPorts.length || 0,
          },
        ],
      },
      pagination: {
        limit: 2,
      },
    },
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    refetch({
      pagination: {
        limit: displayLimit,
      },
      filters: {
        ...variables?.filters,
        search: props.search,
      },
    });
  }, [props.search]);

  const addEdgeContextualNode = useEditFlowStore((s) => s.addEdgeContextualNode);
  const client = useRekuest();

  const onNodeClick = (id: string) => {
    client &&
      client
        .query<ConstantActionQuery>({
          query: ConstantActionDocument,
          variables: { id: id },
        })
        .then(async (event) => {
          console.log(event);
          if (event.data?.action) {
            const flownode = rekuestActionToMatchingNode(event.data?.action, {
              x: 0,
              y: 0,
            });
            console.log("Trying to add", flownode, props.params);
            addEdgeContextualNode(flownode, props.params);
          }
        });
  };

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {data?.actions.map((node) => (
        <Tooltip>
          <TooltipTrigger>
            <Card
              onClick={() => onNodeClick(node.id)}
              className="px-2 py-1 border-solid border-2 border-accent"
            >
              {node.name}
            </Card>
          </TooltipTrigger>
          <TooltipContent align="center">{node.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

const EdgeReactiveNodes = (props: {
  search: string | undefined;
  params: EdgeContextualParams;
}) => {
  const nodes = useEdgeReactiveNodes(props.search, props.params);

  const addEdgeContextualNode = useEditFlowStore((s) => s.addEdgeContextualNode);

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {nodes.map((sug) => (
        <Tooltip>
          <TooltipTrigger>
            <Card
              onClick={() => addEdgeContextualNode(sug.node, props.params)}
              className="px-2 py-1 border-solid border-2 border-accent"
            >
              {sug.title}
            </Card>
          </TooltipTrigger>
          <TooltipContent align="center">{sug.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export const EdgeContextual = (props: { params: EdgeContextualParams }) => {
  const removeEdge = useEditFlowStore((s) => s.removeEdge);

  const [search, setSearch] = useState(undefined);

  const onSubmit = (data: any) => {
    setSearch(data.search);
  };

  return (
    <ContextualContainer
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
      }}
      active={true}
    >
      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2 w-full flex justify-between">
        <TooltipButton
          size={"icon"}
          variant={"outline"}
          onClick={() => {
            removeEdge(props.params.edgeId);
          }}
          className="text-red-800 w-5 h-5"
          tooltip="Remove Edge"
        >
          <X />
        </TooltipButton>
      </div>

      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2  ">
        Transforms
      </div>

      <div className="absolute right-2"></div>

      <SearchForm onSubmit={onSubmit} />

      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap  mb-1">
        <EdgeContextualRekuestNode search={search} params={props.params} />
      </div>
      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap ">
        <EdgeReactiveNodes search={search} params={props.params} />
      </div>
    </ContextualContainer>
  );
};

export const TargetDropContextual = (props: {
  params: DropContextualParams;
  ports: StreamPort[];
}) => {
  return (
    <Card
      className="absolute translate-x-[-50%] z-50"
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
      }}
    >
      Target Action Right Here
    </Card>
  );
};
