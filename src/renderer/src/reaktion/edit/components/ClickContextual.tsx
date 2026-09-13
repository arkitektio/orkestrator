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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GraphNodeKind, ReactiveImplementation } from "@/reaktion/api/graphql";
import { rekuestActionToMatchingNode } from "@/reaktion/plugins/rekuest";
import { nodeIdBuilder, reactiveFlowNode } from "@/reaktion/utils";
import { PortKind } from "@/reaktion/types";
import {
  ConstantActionDocument,
  ConstantActionQuery,
  useAllActionsQuery,
  useProtocolOptionsLazyQuery,
  useAgentsQuery,
  ListAgentFragment,
} from "@/rekuest/api/graphql";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ClickContextualParams, FlowNode, ReactiveNodeSuggestions } from "../../types";
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
        <div className="w-full mb-1">
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

const clickReactiveNodes = (search: string): ReactiveNodeSuggestions[] => {
  const nodes: ReactiveNodeSuggestions[] = [];

  // TODO - Add more nodes here

  const filtered_nodes = nodes.filter((node) =>
    node.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (search.length === 0) {
    return filtered_nodes;
  }

  const isInt = !isNaN(parseInt(search));

  if (isInt) {
    filtered_nodes.push({
      node: reactiveFlowNode({
        title: "Just",
        description: "Just an Int",
        ins: [[]],
        constantsMap: { value: parseInt(search) },
        outs: [
          [
            {
              description: "Just an Int",
              key: "the_int",
              kind: PortKind.Int,
              nullable: false,
              __typename: "ReturnPort",
            },
          ],
        ],
        implementation: ReactiveImplementation.Just,
      }),
      title: `Just ${search} (Int)`,
      description: "Just an Int",
    });
  }

  filtered_nodes.push({
    node: reactiveFlowNode({
      title: "Just",
      description: "Just a String",
      ins: [[]],
      constantsMap: { value: search },
      outs: [
        [
          {
            __typename: "ReturnPort",
            nullable: false,
            description: "Just a String",
            key: "string",
            kind: PortKind.String,
          },
        ],
      ],
      implementation: ReactiveImplementation.Just,
    }),
    title: `Just ${search} (String)`,
    description: "Create the string Hallo on Invocation",
  });

  return filtered_nodes;
};

export const useClickReactiveNodes = (search: string) => {
  return useMemo(() => clickReactiveNodes(search), [search]);
};

const ClickReactiveNodes = (props: {
  search: string | undefined;
  params: ClickContextualParams;
}) => {
  const nodes = useClickReactiveNodes(props.search || "");

  const addClickNode = useEditFlowStore((s) => s.addClickNode);

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {nodes.map((sug) => (
        <Tooltip>
          <TooltipTrigger>
            <Card
              onClick={() => addClickNode(sug.node, props.params)}
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

const ClickArkitektNodes = (props: {
  search: string | undefined;
  params: ClickContextualParams;
}) => {
  const { data, refetch } = useAllActionsQuery({
    variables: {
      filters: {
        search: props.search,
        protocols: [],
        stateful: false,
      },
      pagination: {
        limit: displayLimit,
      },
    },
  });

  useEffect(() => {
    refetch({
      pagination: {
        limit: displayLimit,
      },
      filters: {
        search: props.search,
      },
    });
  }, [props.search]);

  const addClickNode = useEditFlowStore((s) => s.addClickNode);
  const client = useRekuest();

  const onNodeClick = (id: string) => {
    client &&
      client
        .query<ConstantActionQuery>({
          query: ConstantActionDocument,
          variables: { id: id },
        })
        .then(async (event) => {

          if (!event.data?.action) {
            return;
          }
          const parentAgentNode = {
            id: nodeIdBuilder(),
            type: "AgentSubFlowNode",
            position: { x: 0, y: 0 },
            data: {
              kind: GraphNodeKind.AgentSubflow,
              title: event.data?.action?.app?.identifier,
              description: "Agent Subflow",
              ins: [],
              outs: [],
              voids: [],
              constants: [],
              constantsMap: {},
              globalsMap: {},
              app: event.data?.action?.app?.identifier
            },
          } as FlowNode

          const flownode = rekuestActionToMatchingNode(event.data?.action, {
            x: 0,
            y: 0,
          });


          flownode.parentId = parentAgentNode.id;
          flownode.extent = "parent";
          console.log("Trying to add", flownode, props.params);
          console.log("Trying to add parent", parentAgentNode, props.params);
          addClickNode(parentAgentNode, props.params);
          addClickNode(flownode, props.params);

        });
  };



  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {data?.actions.map((node) => (
        <Tooltip key={node.id}>
          <TooltipTrigger>
            <>
              <Card
                  onClick={() => onNodeClick(node.id)}
                  className="px-2 py-1 border-solid border-2 border-accent"
                >
                  {node.name}
              </Card>
            </>
          </TooltipTrigger>
          <TooltipContent align="center">{node.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

const displayLimit = 5;

const ClickAgents = (props: {
  search: string | undefined;
  params: ClickContextualParams;
}) => {
  const { data, refetch } = useAgentsQuery({
    variables: {
      filters: {
        search: props.search,
      },
      pagination: {
        limit: 3,
      },
    },
  });

  useEffect(() => {
    refetch({
      filters: {
        search: props.search,
      },
      pagination: {
        limit: 3,
      },
    });
  }, [props.search]);

  const addClickNode = useEditFlowStore((s) => s.addClickNode);

  const onAgentClick = (agent: ListAgentFragment) => {
    addClickNode(
      {
        id: nodeIdBuilder(),
        type: "AgentSubFlowNode",
        position: { x: 0, y: 0 },
        data: {
          kind: GraphNodeKind.AgentSubflow,
          title: agent.app.identifier,
          description: "A singular instance of the agent " + agent.app.identifier,
          ins: [],
          outs: [],
          voids: [],
          constants: [],
          constantsMap: {},
          globalsMap: {},
          appFilter: agent.app.identifier,
          versionFilter: agent.release.version,
          deviceFilter: agent.device?.id,
          userFilter: agent.user.sub,
          autoResolvable: false,
        },
      } as FlowNode,
      props.params,
    );



  };

  return (
    <div className="flex flex-row gap-1 my-auto flex-wrap mt-2">
      {data?.agents.map((agent) => (
        <Tooltip key={agent.id}>
          <TooltipTrigger>
            <Card
              onClick={() => onAgentClick(agent)}
              className="px-2 py-1 border-solid border-2 border-indigo-400"
            >
              {agent.name}
            </Card>
          </TooltipTrigger>
          <TooltipContent align="center">{agent.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export const ClickContextual = (props: { params: ClickContextualParams }) => {
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
      <div className="text-xs text-muted-foreground inline relative mx-auto mb-2  mt">
        All Nodes
      </div>
      <SearchForm onSubmit={onSubmit} />

      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap  mb-1">
        <ClickArkitektNodes search={search} params={props.params} />
      </div>
      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap  mb-1">
        <ClickAgents search={search} params={props.params} />
      </div>
      <Separator />
      <div className="flex flex-row gap-1 my-auto flex-wrap ">
        <ClickReactiveNodes search={search} params={props.params} />
      </div>
    </ContextualContainer>
  );
};
