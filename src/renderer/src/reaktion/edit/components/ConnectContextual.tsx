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
import { ActionDescription } from "@/lib/rekuest/ActionDescription";
import {
  FlussArgPortFragment,
  FlussReturnPortFragment,
  ReactiveImplementation,
} from "@/reaktion/api/graphql";
import { rekuestActionToMatchingNode } from "@/reaktion/plugins/rekuest";
import { reactiveFlowNode, streamToReadable } from "@/reaktion/utils";
import {
  ActionScope,
  AllActionsQueryVariables,
  ConstantActionDocument,
  ConstantActionQuery,
  DemandKind,
  useAllActionsQuery,
  useProtocolOptionsLazyQuery,
} from "@/rekuest/api/graphql";
import clsx from "clsx";
import { ArrowDown } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  ConnectContextualParams,
  DropContextualParams,
  GeneralPort,
  PortKind,
  ReactiveNodeSuggestions,
  StreamPort,
} from "../../types";
import { useEditFlowStore } from "../context";
import { ContextualContainer } from "./ContextualContainer";
import { TemplateSelector } from "./TemplateSelector";



export const argToReturn = (arg: FlussArgPortFragment): FlussReturnPortFragment => ({
  __typename: "ReturnPort",
  key: arg.key,
  kind: arg.kind,
  identifier: arg.identifier,
  nullable: arg.nullable,
  description: arg.description,
  children: arg.children?.map((child) => ({
    __typename: "ReturnPort",
    key: child.key,
    kind: child.kind,
    identifier: child.identifier,
    nullable: child.nullable,
  })),
});

export const returnToArg = (arg: FlussReturnPortFragment): FlussArgPortFragment => ({
  __typename: "ArgPort",
  key: arg.key,
   kind: arg.kind,
  identifier: arg.identifier,
  nullable: arg.nullable,
  description: arg.description,
  children: arg.children?.map((child) => ({
    __typename: "ArgPort",
    key: child.key,
    kind: child.kind,
    identifier: child.identifier,
    nullable: child.nullable,
  })),
});






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

export const allandone = <A extends any, B extends any>(
  left: A[],
  right: B[],
  predicate: (l: A, r: B) => boolean,
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

const combineOptions = [
  {
    title: "Zip",
    description: "Zip multiple streams into one",
    implementation: ReactiveImplementation.Zip,
  },
  {
    title: "WithLatest",
    description: "Combine the latest of stream a with the latest of stream b",
    implementation: ReactiveImplementation.Withlatest,
  },
];

const bufferOptions = [
  {
    title: "Buffer Count",
    description: "Buffer the count stream",
    implementation: ReactiveImplementation.BufferCount,
    constantsMap: {
      count: 1,
    },
  },
  {
    title: "BufferComplete",
    description: "Buffer the stream until complete",
    implementation: ReactiveImplementation.BufferComplete,
    constantsMap: {},
  },
  {
    title: "BufferUntil",
    description: "Buffer the stream until a condition is met",
    implementation: ReactiveImplementation.BufferUntil,
    constantsMap: {},
  },
];

// Checks if two items are structurally equal, that means they have the same kind and identifier. (If the kind is a structure)
const isStructuralMatch = (
  item1: GeneralPort | undefined,
  item2: GeneralPort | undefined,
) => {
  if (!item1 || !item2) {
    return false;
  }

  return (
    item1.kind === item2.kind &&
    (item2.kind
      ? PortKind.Structure
        ? item1.identifier === item2.identifier
        : true
      : false)
  );
};

const connectReactiveNodes = (
  leftPorts: StreamPort[],
  rightPorts: StreamPort[],
  search: string | undefined,
): ReactiveNodeSuggestions[] => {
  const nodes: ReactiveNodeSuggestions[] = [];

  if (!leftPorts || !rightPorts) {
    return [];
  }

  if (leftPorts.length == 0 && rightPorts.length >= 1) {
    nodes.push({
      node: reactiveFlowNode({
        title: "Gate",
        description: "Gate the signal",
        ins: [leftPorts],
        outs: [rightPorts],
        implementation: ReactiveImplementation.Gate,
      }),
      title: "Gate",
      description:
        "Gates the stream (only lets it through if the gate is open)",
    });
  }

  if (leftPorts.length == 0 && leftPorts.length < rightPorts.length) {
    const intersection = leftPorts.filter((a) =>
      rightPorts.find((b) => isStructuralMatch(a, b)),
    );

    if (intersection.length > 0) {
      combineOptions.map((option) => {
        nodes.push({
          node: reactiveFlowNode({
            title: option.title,
            description: option.description,
            ins: [leftPorts],
            outs: [rightPorts],
            implementation: option.implementation,
          }),
          title: option.title,
          description: option.description,
        });
      });
    }
  }

  if (
    leftPorts.length == 1 &&
    leftPorts.at(0)?.kind == PortKind.List &&
    isStructuralMatch(leftPorts.at(0)?.children?.at(0), rightPorts.at(0))
  ) {
    // Is chunk transferable
    nodes.push({
      node: reactiveFlowNode({
        title: "Chunk",
        description: "Chunk the stream",
        ins: [leftPorts],
        outs: [rightPorts],
        implementation: ReactiveImplementation.Chunk,
      }),
      title: "Chunk",
      description: "Chunk the stream",
    });
  }

  if (
    rightPorts.length == 1 &&
    rightPorts.at(0)?.kind == PortKind.List &&
    isStructuralMatch(rightPorts.at(0)?.children?.at(0), leftPorts.at(0))
  ) {
    // Is chunk transferable
    bufferOptions.map((option) => {
      nodes.push({
        node: reactiveFlowNode({
          title: option.title,
          description: option.description,
          ins: [leftPorts],
          constantsMap: option.constantsMap,
          outs: [rightPorts],
          implementation: option.implementation,
        }),
        title: option.title,
        description: option.description,
      });
    });
  }

  if (
    allandone(leftPorts, rightPorts, (port) => port.kind === PortKind.Float)
  ) {
    nodes.push({
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

  if (rightPorts.length == 0) {
    nodes.push({
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

  if (leftPorts.length > rightPorts.length && rightPorts.length == 1) {
    for (const i in leftPorts) {
      nodes.push({
        node: reactiveFlowNode({
          title: "Select " + leftPorts[i].key,
          description: "Select an item of the stream",
          ins: [leftPorts],
          outs: [[leftPorts[i]]],
          implementation: ReactiveImplementation.Select,
        }),
        title: "Select " + leftPorts[i].key,
        description: "Select an item of the stream",
      });
    }
  }

  for (const mapping of generateAllMappings(leftPorts, rightPorts)) {
    nodes.push({
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

  return nodes.filter((node) =>
    node.title.toLowerCase().includes(search?.toLowerCase() || ""),
  );
};

export const useConnectReactiveNodes = (leftPorts, rightPorts, search) => {
  return useMemo(
    () => connectReactiveNodes(leftPorts, rightPorts, search),
    [leftPorts, rightPorts, search],
  );
};

const ConnectReactiveNodes = (props: {
  search: string | undefined;
  params: ConnectContextualParams;
  leftPorts: StreamPort[];
  rightPorts: StreamPort[];
}) => {
  const nodes = useConnectReactiveNodes(
    props.leftPorts,
    props.rightPorts,
    props.search || "",
  );

  const addConnectContextualNode = useEditFlowStore((s) => s.addConnectContextualNode);

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {nodes.map((sug) => (
        <Tooltip key={sug.node.id}>
          <TooltipTrigger>
            <Card
              onClick={() => addConnectContextualNode(sug.node, props.params)}
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

const buildVariabels = (
  leftPorts: StreamPort[],
  rightPorts: StreamPort[],
  search: string | undefined,
): AllActionsQueryVariables => ({
  filters: {
    search: search,
    demands: [
      {
        kind: DemandKind.Args,
        matches:
          leftPorts.map((port, index) => ({
            at: index,
            kind: port.kind,
            identifier: port.identifier,
            children: port.children?.map((port, index) => ({
              at: index,
              kind: port.kind,
              identifier: port.identifier,
            })),
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
            children: port.children?.map((port, index) => ({
              at: index,
              kind: port.kind,
              identifier: port.identifier,
            })),
          })) || [],
        forceNonNullableLength: rightPorts.length || 0,
      },
    ],
  },
  pagination: {
    limit: 2,
  },
});

const ConnectArkitektNodes = (props: {
  search: string | undefined;
  params: ConnectContextualParams;
  leftPorts: StreamPort[];
  rightPorts: StreamPort[];
}) => {
  const { data, refetch, error } = useAllActionsQuery({
    variables: buildVariabels(props.leftPorts, props.rightPorts, props.search),
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    refetch(buildVariabels(props.leftPorts, props.rightPorts, props.search));
  }, [props.leftPorts, props.rightPorts, props.search]);

  const addConnectContextualNode = useEditFlowStore((s) => s.addConnectContextualNode);

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
            addConnectContextualNode(flownode, props.params);
          }
        });
  };

  const onTemplateClick = (node: string, template: string) => {
    client &&
      client
        .query<ConstantActionQuery>({
          query: ConstantActionDocument,
          variables: { id: node },
        })
        .then(async (event) => {
          console.log(event);
          if (event.data?.action) {
            const flownode = rekuestActionToMatchingNode(event.data?.action, {
              x: 0,
              y: 0,
            });
            (flownode.data as { binds?: { templates: string[] } }).binds = {
              templates: [template],
            };
            console.log("Trying to add", flownode, props.params);
            addConnectContextualNode(flownode, props.params);
          }
        });
  };

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data?.actions.map((action) => (
        <Tooltip key={action.id}>
          <TooltipTrigger>
            {action.stateful ? (
              <Popover>
                <PopoverTrigger>
                  <Card className="px-2 py-1 border-solid border-2 border-green-300 border ">
                    {action.name}
                  </Card>
                </PopoverTrigger>
                <PopoverContent className="rounded rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2  mt">
                    This is a stateful node and needs to be bound to a specific
                    instance
                  </div>
                  <TemplateSelector
                    hash={action.hash}
                    node={action.id}
                    onClick={onTemplateClick}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Card
                onClick={() => onNodeClick(action.id)}
                className={clsx(
                  "px-2 py-1 border",
                  action.scope == ActionScope.Global
                    ? ""
                    : "dark:border-blue-200",
                )}
              >
                {action.name}
              </Card>
            )}
          </TooltipTrigger>
          <TooltipContent align="center">
            {action.description && (
              <ActionDescription description={action.description} />
            )}
            {action.scope == ActionScope.Global ? (
              " "
            ) : (
              <div className="text-blue-200 mt-2">
                This Node will bind this workflow to specific apps
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export const ConnectContextual = (props: {
  params: ConnectContextualParams;
}) => {
  const [search, setSearch] = React.useState<string | undefined>(undefined);

  const leftPorts = props.params.leftNode.data.outs[props.params.leftStream];
  const rightPorts = props.params.rightNode.data.ins[props.params.rightStream];

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
      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2  ">
        {streamToReadable(leftPorts)} <b>to</b> {streamToReadable(rightPorts)}
      </div>

      <SearchForm onSubmit={onSubmit} />

      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap mt-2"></div>
      <ConnectArkitektNodes
        leftPorts={leftPorts}
        rightPorts={rightPorts}
        search={search}
        params={props.params}
      />
      <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
        <ConnectReactiveNodes
          leftPorts={leftPorts}
          rightPorts={rightPorts}
          search={search}
          params={props.params}
        />
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
