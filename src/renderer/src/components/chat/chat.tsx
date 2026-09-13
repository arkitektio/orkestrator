import {
  RoomFragment,
  StructureInput,
  useSendMessageMutation,
} from "@/alpaka/api/graphql";
import { toStructureInputs } from "@/alpaka/roomTalkingAbout";
import { Guard, useRekuest } from "@/app/Arkitekt";
import { buildAssignInput } from "@/rekuest/assign";
import { useSmartDrop } from "@/providers/smart/hooks";
import {
  Ban,
  Bot,
  Check,
  ChevronDown,
  Download,
  MessageSquareText,
  PackagePlus,
} from "lucide-react";
import { Card } from "../ui/card";
import { ChatList } from "./chat-list";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/widgets/ArgsContainer";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { usePortForm } from "@/rekuest/hooks/usePortForm";
import { submittedDataToRekuestFormat } from "@/rekuest/widgets/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useAllActionsQuery,
  useDetailActionQuery,
  DemandKind,
  PortKind,
  TaskEventKind,
  useCancelMutation,
} from "@/rekuest/api/graphql";
import {
  useAllPrimaryDefinitionsQuery,
  ListDefinitionFragment,
  PortKind as KabinetPortKind,
} from "@/kabinet/api/graphql";
import { useHashActionWithProgress } from "@/rekuest/hooks/useHashActionWithProgress";
import { KabinetDefinition } from "@/linkers";
import { useAssignWithCallback } from "@/rekuest/hooks/useAssign";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

type InstallAction = {
  id: string;
  hash: string;
  name: string;
  description?: string | null;
};

const InstallReplyerDefinitionButton = (props: {
  definition: ListDefinitionFragment;
  action: InstallAction;
  onInstalled?: () => void;
}) => {
  const client = useRekuest();
  const { assign, progress, installed } = useHashActionWithProgress({
    hash: props.action.hash,
    onDone: () => {
      void client.refetchQueries({ include: ["AllActions"] });
      props.onInstalled?.();
    },
  });

  return (
    <CommandItem
      value={`install-replyer-${props.definition.id}-${props.action.id}`}
      onSelect={() => {
        void assign({
          definition: {
            object: props.definition.id,
            __identifier: KabinetDefinition.identifier,
          },
        });
      }}
      disabled={!installed}
      style={{
        backgroundSize: `${progress || 0}% 100%`,
        backgroundImage: `linear-gradient(to right, #10b981 ${progress}%, #10b981 ${progress}%)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
      }}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{props.definition.name}</span>
        {props.definition.description && (
          <span className="truncate text-xs text-muted-foreground">
            {props.definition.description}
          </span>
        )}
      </div>
    </CommandItem>
  );
};

const InstallReplyerSection = (props: {
  search: string;
  onInstalled?: () => void;
}) => {
  const { data: enginesData } = useAllActionsQuery({
    variables: {
      filters: {
        demands: [
          {
            kind: DemandKind.Args,
            matches: [
              { at: 0, kind: PortKind.Structure, identifier: "@kabinet/definition" },
            ],
          },
          {
            kind: DemandKind.Returns,
            matches: [
              { at: 0, kind: PortKind.Structure, identifier: "@kabinet/pod" },
            ],
          },
        ],
      },
    },
    fetchPolicy: "cache-first",
  });

  const { data: definitionsData } = useAllPrimaryDefinitionsQuery({
    variables: {
      filters: {
        demands: [
          {
            kind: DemandKind.Args,
            matches: [{ kind: KabinetPortKind.Structure, identifier: "@alpaka/message" }],
          },
          {
            kind: DemandKind.Returns,
            matches: [{ kind: KabinetPortKind.Structure, identifier: "@alpaka/message" }],
          },
        ],
        search: props.search !== "" ? props.search : undefined,
      },
    },
    fetchPolicy: "cache-and-network",
  });

  const engines = enginesData?.actions ?? [];
  const definitions = definitionsData?.definitions ?? [];

  if (engines.length === 0) {
    return (
      <div className="px-3 py-3 text-center text-xs text-muted-foreground">
        No install engine available
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <div className="px-3 py-3 text-center text-xs text-muted-foreground">
        No installable replyers found
      </div>
    );
  }

  return (
    <CommandGroup heading="Install Replyer">
      {definitions.map((definition) =>
        engines.map((engine) => (
          <InstallReplyerDefinitionButton
            key={`${definition.id}-${engine.id}`}
            definition={definition}
            action={engine as InstallAction}
            onInstalled={props.onInstalled}
          />
        ))
      )}
    </CommandGroup>
  );
};

type ReplyerAction = { id: string; name: string };

const ReplyerControl = (props: {
  actions: ReplyerAction[];
  selectedActionId: string;
  onSelect: (id: string) => void;
  action: any;
  form: any;
  registry: any;
  hiddenArgs: Record<string, boolean>;
  hasPriorTask: boolean;
}) => {
  const {
    actions,
    selectedActionId,
    onSelect,
    action,
    form,
    registry,
    hiddenArgs,
    hasPriorTask,
  } = props;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [argsOpen, setArgsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = actions.find((a) => a.id === selectedActionId);
  const filtered = search
    ? actions.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : actions;

  const visibleArgs = useMemo(
    () => ((action?.args ?? []) as any[]).filter((arg) => !hiddenArgs[arg.key]),
    [action, hiddenArgs]
  );
  const hasArgs = selectedActionId !== "none" && action && visibleArgs.length > 0;

  // Pop the args out automatically the first time a replyer with required args
  // is selected and there's no prior task to reuse.
  useEffect(() => {
    if (hasArgs && !hasPriorTask) {
      setArgsOpen(true);
    }
  }, [hasArgs, hasPriorTask, action?.id]);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-w-0 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bot className="h-4 w-4 shrink-0" />
            <span className="max-w-[120px] truncate">
              {selected ? selected.name : "No replyer"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="top">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search replyers..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandGroup heading="Replyers">
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onSelect("none");
                    setPickerOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Ban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">No replyer</span>
                  {selectedActionId === "none" && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </CommandItem>
                {filtered.map((act) => (
                  <CommandItem
                    key={act.id}
                    value={act.id}
                    onSelect={() => {
                      onSelect(act.id);
                      setPickerOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{act.name}</span>
                    {selectedActionId === act.id && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <Guard.Kabinet unavailable={<></>}>
                <CommandSeparator />
                <InstallReplyerSection
                  search={search}
                  onInstalled={() => setPickerOpen(false)}
                />
              </Guard.Kabinet>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {hasArgs && (
        <Popover open={argsOpen} onOpenChange={setArgsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <PackagePlus className="h-3.5 w-3.5 shrink-0" />
              Args
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start" side="top">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {selected?.name ?? "Replyer"} arguments
            </div>
            <Form {...form}>
              <div className="flex flex-col gap-2">
                <ArgsContainer
                  registry={registry}
                  groups={action?.portGroups || []}
                  ports={action?.args || []}
                  hidden={hiddenArgs}
                  path={[]}
                />
              </div>
            </Form>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export interface ActiveTask {
  id: string;
  reference: string;
  actionName: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR' | 'CANCELLED';
  progress?: number | null;
  message?: string | null;
  delegatedName?: string | null;
}


interface ChatProps {
  isMobile: boolean;
  room: RoomFragment;
}

export function Chat({ isMobile, room }: ChatProps) {
  const [send, { loading }] = useSendMessageMutation({
    refetchQueries: ["DetailRoom"],
  });

  const [selectedActionId, setSelectedActionId] = useState<string>("none");
  const [hasAutoselected, setHasAutoselected] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [stagedStructures, setStagedStructures] = useState<StructureInput[]>([]);
  const [prefillText, setPrefillText] = useState("");

  useEffect(() => {
    const textParam = searchParams.get("text");
    const prefill = searchParams.get("prefillStructures");

    if (textParam) {
      setPrefillText(textParam);
    }

    if (prefill) {
      try {
        const parsed = JSON.parse(prefill);
        if (Array.isArray(parsed)) {
          setStagedStructures(
            toStructureInputs(
              parsed.map((structure) => ({
                identifier: structure?.identifier,
                object: { id: structure?.object },
              })),
            ),
          );
        }
      } catch (e) {
        console.error("Failed to parse prefillStructures", e);
      }
    }

    if (textParam || prefill) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("text");
      nextParams.delete("prefillStructures");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: actionsData } = useAllActionsQuery({
    variables: {
      filters: {
        demands: [
          {
            kind: DemandKind.Args,
            matches: [
              {
                kind: PortKind.Structure,
                identifier: "@alpaka/message",
              },
            ],
          },
          {
            kind: DemandKind.Returns,
            matches: [
              {
                kind: PortKind.Structure,
                identifier: "@alpaka/message",
              },
            ],
          },
        ],
      },
    },
  });

  useEffect(() => {
    if (!hasAutoselected && actionsData?.actions && actionsData.actions.length > 0) {
      setSelectedActionId(actionsData.actions[0].id);
      setHasAutoselected(true);
    }
  }, [actionsData, hasAutoselected]);

  const { data: actionDetailData } = useDetailActionQuery({
    variables: {
      id: selectedActionId,
    },
    skip: !selectedActionId || selectedActionId === "none",
  });
  const action = actionDetailData?.action;

  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);

  const { assign } = useAssignWithCallback({
    onDone: (event) => {
      setActiveTasks((prev) => {
        return prev.map((ass) => {
          if (ass.reference === event.task.reference) {
            let status: ActiveTask["status"] = ass.status;
            if (event.kind === TaskEventKind.Completed) {
              status = "DONE";
            } else if (event.kind === TaskEventKind.Failed) {
              status = "ERROR";
            } else if (event.kind === TaskEventKind.Cancelled) {
              status = "CANCELLED";
            } else {
              status = "RUNNING";
            }

            return {
              ...ass,
              status,
              progress: event.progress !== undefined && event.progress !== null ? event.progress : ass.progress,
              message: event.message || ass.message,
              delegatedName: event.delegatedTo?.implementation?.action?.name || ass.delegatedName,
            };
          }
          return ass;
        });
      });
    },
  });

  useEffect(() => {
    const doneTasks = activeTasks.filter((ass) => ass.status === "DONE");
    if (doneTasks.length > 0) {
      const timers = doneTasks.map((ass) => {
        return setTimeout(() => {
          setActiveTasks((prev) => prev.filter((p) => p.reference !== ass.reference));
        }, 3000);
      });
      return () => {
        timers.forEach((t) => clearTimeout(t));
      };
    }
    return undefined;
  }, [activeTasks]);

  const dismissTask = (reference: string) => {
    setActiveTasks((prev) => prev.filter((ass) => ass.reference !== reference));
  };

  const [cancelAssign] = useCancelMutation();

  const handleCancelTask = async (id: string, _reference: string) => {
    if (!id) return;
    try {
      toast.info("Canceling replyer...");
      await cancelAssign({
        variables: {
          input: { task: id },
        },
      });
      toast.success("Cancellation requested");
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to cancel: ${err.message || err}`);
    }
  };

  const handleRereply = async (messageId: string) => {
    if (selectedActionId && selectedActionId !== "none" && messageKey && action) {
      const isValid = await form.trigger();
      if (!isValid) {
        toast.error("Please fill in all required arguments for the selected replyer.");
        return;
      }

      const rawFormValues = form.getValues();
      const formattedFormValues = submittedDataToRekuestFormat(rawFormValues, action.args as any);

      const assignArgs: Record<string, any> = {
        ...formattedFormValues,
        [messageKey]: {
          __identifier: "@alpaka/message",
          object: messageId,
        },
      };

      const reference = uuidv4();

      setActiveTasks((prev) => [
        ...prev,
        {
          id: "",
          reference,
          actionName: action.name,
          status: "PENDING",
          progress: null,
          message: "Assigning...",
        },
      ]);

      try {
        const task = await assign(buildAssignInput({
          action: selectedActionId,
          args: assignArgs,
          reference,
        }));

        setActiveTasks((prev) =>
          prev.map((ass) =>
            ass.reference === reference
              ? { ...ass, id: task.id, status: "RUNNING" }
              : ass
          )
        );
      } catch (err: any) {
        console.error(err);
        toast.error(`Replyer failed: ${err.message || err}`);
        setActiveTasks((prev) =>
          prev.map((ass) =>
            ass.reference === reference
              ? { ...ass, status: "ERROR", message: err.message || "Failed to trigger" }
              : ass
          )
        );
      }
    }
  };

  const { registry } = useWidgetRegistry();

  const selectedAction = useMemo(() => {
    if (!actionsData?.actions || !selectedActionId || selectedActionId === "none") {
      return undefined;
    }
    return actionsData.actions.find((act) => act.id === selectedActionId);
  }, [actionsData, selectedActionId]);

  const latestTask = selectedAction?.latestTask;

  const messageArg = useMemo(() => {
    return action?.args.find(
      (arg) =>
        arg.kind === PortKind.Structure &&
        arg.identifier === "@alpaka/message"
    );
  }, [action]);
  const messageKey = messageArg?.key;

  const hiddenArgs = useMemo(() => {
    if (messageKey) {
      return { [messageKey]: true };
    }
    return {};
  }, [messageKey]);

  const formOverwrites = useMemo(() => {
    const overwrites: Record<string, any> = {};

    if (latestTask?.args) {
      Object.assign(overwrites, latestTask.args);
    }

    if (messageKey) {
      overwrites[messageKey] = {
        __identifier: "@alpaka/message",
        object: "dummy",
      };
    }
    return overwrites;
  }, [messageKey, latestTask]);

  const form = usePortForm({
    ports: (action?.args || []) as any,
    overwrites: formOverwrites,
  });

  const sendMessage = async (text: string) => {
    if (selectedActionId && selectedActionId !== "none") {
      const isValid = await form.trigger();
      if (!isValid) {
        toast.error("Please fill in all required arguments for the selected replyer.");
        return;
      }
    }

    try {
      const res = await send({
        variables: {
          input: {
            text: text,
            room: room.id,
            agentId: "default",
            attachStructures: stagedStructures.length > 0 ? stagedStructures : undefined,
          },
        },
      });

      const createdMessage = res.data?.send;

      setStagedStructures([]);

      if (createdMessage && selectedActionId && selectedActionId !== "none" && messageKey && action) {
        const rawFormValues = form.getValues();
        const formattedFormValues = submittedDataToRekuestFormat(rawFormValues, action.args as any);

        const assignArgs: Record<string, any> = {
          ...formattedFormValues,
          [messageKey]: {
            __identifier: "@alpaka/message",
            object: createdMessage.id,
          },
        };

        const reference = uuidv4();

        setActiveTasks((prev) => [
          ...prev,
          {
            id: "",
            reference,
            actionName: action.name,
            status: "PENDING",
            progress: null,
            message: "Assigning...",
          },
        ]);

        try {
          const task = await assign(buildAssignInput({
            action: selectedActionId,
            args: assignArgs,
            reference,
          }));

          setActiveTasks((prev) =>
            prev.map((ass) =>
              ass.reference === reference
                ? { ...ass, id: task.id, status: "RUNNING" }
                : ass
            )
          );
        } catch (err: any) {
          console.error(err);
          toast.error(`Replyer failed: ${err.message || err}`);
          setActiveTasks((prev) =>
            prev.map((ass) =>
              ass.reference === reference
                ? { ...ass, status: "ERROR", message: err.message || "Failed to trigger" }
                : ass
            )
          );
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to send message: ${error.message || error}`);
    }
  };

  const [{ isOver }, drop] = useSmartDrop((structures) => {
    const attachable = toStructureInputs(structures);

    // Alpaka addresses foreign objects by a numeric id; anything else cannot
    // be attached, and dropping it silently would look like a broken drag.
    if (attachable.length < structures.length) {
      toast.error(
        attachable.length === 0
          ? "That cannot be attached to a chat"
          : "Some of those cannot be attached to a chat",
      );
    }

    setStagedStructures((prev) => [...prev, ...attachable]);
  });

  // Sorted once per `room.messages` identity: this component rerenders on
  // every inbound message, and `createdAt` is ISO-8601 so string comparison
  // orders correctly without allocating two Dates per comparison.
  const sortedMessages = useMemo(
    () =>
      [...room.messages].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
      ),
    [room.messages],
  );

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[inherit]"
      ref={(node) => {
        drop(node);
      }}
    >
      {(isOver || loading) && (
        <div className="absolute top-0 left-0 z-50 h-full w-full backdrop-blur-sm">
          <div className="flex items-center justify-center h-full">
            <Card className="p-4">
              {loading ? "Adding..." : "Drop to Add to Chat"}
            </Card>
          </div>
        </div>
      )}
      <ChatList
        messages={sortedMessages}
        currentAgentId="default"
        sendMessage={sendMessage}
        isMobile={isMobile}
        stagedStructures={stagedStructures}
        onRemoveStructure={(idx) => {
          setStagedStructures((prev) => prev.filter((_, i) => i !== idx));
        }}
        prefillText={prefillText}
        activeTasks={activeTasks}
        onDismissTask={dismissTask}
        onCancelTask={handleCancelTask}
        onRereply={selectedActionId !== "none" ? handleRereply : undefined}
        replyerControl={
          <ReplyerControl
            actions={actionsData?.actions ?? []}
            selectedActionId={selectedActionId}
            onSelect={setSelectedActionId}
            action={action}
            form={form}
            registry={registry}
            hiddenArgs={hiddenArgs}
            hasPriorTask={!!latestTask}
          />
        }
      />
    </div>
  );
}
