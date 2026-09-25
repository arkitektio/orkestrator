import {
  RoomFragment,
  StructureInput,
  useSendMessageMutation,
} from "@/alpaka/api/graphql";
import {
  firstMessageAttachments,
  toStructureInputs,
} from "@/alpaka/roomTalkingAbout";
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
import { Card } from "@/components/ui/card";
import { ChatList } from "./chat-list";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/ports/ArgsContainer";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";
import { usePortForm } from "@/lib/ports/usePortForm";
import { submittedDataToRekuestFormat } from "@/lib/ports/utils";
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
  TaskDocument,
  TaskQuery,
  TaskQueryVariables,
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
import { useTasks } from "@/rekuest/hooks/useTasks";
import {
  ActiveTask,
  DISMISS_AFTER_MS,
  applyTaskEvent,
  bindTask,
  failTask,
  isSettled,
  settleFromTasks,
  startTask,
} from "./activeTasks";
import {
  confirmPending,
  dropPending,
  settlePending,
  startPending,
  type PendingMessage,
} from "./pendingMessages";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

/** How long after a message lands a still-spinning pill re-checks its task. */
const RECHECK_AFTER_MESSAGE_MS = 5000;

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

export type { ActiveTask } from "./activeTasks";

/**
 * Settles spinning pills from the cached task list.
 *
 * The event callback is the fast path, and it can miss: it is torn down on the
 * terminal event, so one lost delivery would leave a spinner for good. The task
 * itself cannot be missed — `TaskUpdater` keeps the cached list current whether
 * or not a callback heard the event.
 *
 * Its own component, mounted only while a pill spins: reading the list here
 * rerenders on every task event in the app, which `Chat` should not.
 */
const PillSettler = (props: {
  pills: ActiveTask[];
  onSettle: (settle: (pills: ActiveTask[]) => ActiveTask[]) => void;
}) => {
  const { data } = useTasks();
  const { pills, onSettle } = props;

  useEffect(() => {
    const known = data?.myTasks;
    if (known) onSettle((prev) => settleFromTasks(prev, known));
  }, [data, pills, onSettle]);

  return null;
};

interface ChatProps {
  isMobile: boolean;
  room: RoomFragment;
  /** What this chat is about, when the surface showing it knows (a model's
   *  chat tab). Attached to the opening message. */
  talkingAbout?: readonly StructureInput[];
}

export function Chat({ isMobile, room, talkingAbout }: ChatProps) {
  const [send] = useSendMessageMutation({
    refetchQueries: ["DetailRoom"],
  });

  // Sent, not delivered back yet. These render as real rows that pulse, so
  // nothing covers the conversation while a message is on its way.
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

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
                id: structure?.object,
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

  // A chat started about something carries it on its opening message. Seeded
  // once per room, so a chip the user removed stays removed; and after the
  // URL prefill above, which stages the same structures and must not double.
  const seededRoomId = useRef<string | null>(null);
  useEffect(() => {
    if (seededRoomId.current === room.id) return;
    seededRoomId.current = room.id;

    const attachments = firstMessageAttachments(room, talkingAbout);
    if (attachments.length === 0) return;

    setStagedStructures((prev) => (prev.length > 0 ? prev : attachments));
  }, [room, talkingAbout]);

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
    onDone: (event) => setActiveTasks((prev) => applyTaskEvent(prev, event)),
  });

  // If the subscription itself dropped the terminal event, the cache that
  // `PillSettler` reads is stale too.
  // A message landing while a pill still spins is the cue that its replyer may
  // be finished: ask the server once, a moment later.
  const rekuest = useRekuest();
  const messageCount = room.messages.length;
  const activeTasksRef = useRef(activeTasks);
  activeTasksRef.current = activeTasks;
  useEffect(() => {
    if (!rekuest) return undefined;

    const timer = setTimeout(() => {
      const spinning = activeTasksRef.current.filter(
        (task) => task.id && !isSettled(task.status),
      );
      spinning.forEach((pill) => {
        void rekuest
          .query<TaskQuery, TaskQueryVariables>({
            query: TaskDocument,
            variables: { id: pill.id },
            fetchPolicy: "network-only",
          })
          .then(({ data }) => {
            const task = data?.task;
            if (task) setActiveTasks((prev) => settleFromTasks(prev, [task]));
          })
          .catch(() => {
            // A failed re-check changes nothing; the pill keeps its cancel button.
          });
      });
    }, RECHECK_AFTER_MESSAGE_MS);

    return () => clearTimeout(timer);
  }, [messageCount, rekuest]);

  // Every settled pill leaves on its own. One timer per pill, started when it
  // settles and left alone after: restarting them on each state change let the
  // progress events of another reply keep a finished pill up indefinitely.
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = dismissTimers.current;

    activeTasks.forEach((task) => {
      if (!isSettled(task.status) || timers.has(task.reference)) return;
      timers.set(
        task.reference,
        setTimeout(() => {
          timers.delete(task.reference);
          setActiveTasks((prev) => prev.filter((p) => p.reference !== task.reference));
        }, DISMISS_AFTER_MS[task.status]),
      );
    });

    timers.forEach((timer, reference) => {
      if (activeTasks.some((task) => task.reference === reference)) return;
      clearTimeout(timer);
      timers.delete(reference);
    });
  }, [activeTasks]);
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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

  /** Assign the selected replyer to a message, with a pill to follow it. */
  const runReplyer = async (messageId: string) => {
    if (!selectedActionId || selectedActionId === "none" || !messageKey || !action) {
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
    setActiveTasks((prev) => startTask(prev, reference, action.name));

    try {
      const task = await assign(buildAssignInput({
        action: selectedActionId,
        args: assignArgs,
        reference,
      }));

      setActiveTasks((prev) => bindTask(prev, reference, task));
    } catch (err: any) {
      console.error(err);
      toast.error(`Replyer failed: ${err.message || err}`);
      setActiveTasks((prev) =>
        failTask(prev, reference, err.message || "Failed to trigger"),
      );
    }
  };

  const handleRereply = async (messageId: string) => {
    if (selectedActionId && selectedActionId !== "none" && messageKey && action) {
      const isValid = await form.trigger();
      if (!isValid) {
        toast.error("Please fill in all required arguments for the selected replyer.");
        return;
      }

      await runReplyer(messageId);
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

    // Staged structures are cleared with the same tick that puts the row in
    // the list: they have moved into the message, and leaving them on the
    // composer would read as "not sent".
    const attached = stagedStructures;
    const localId = uuidv4();
    setPendingMessages((prev) =>
      startPending(prev, localId, text, attached, new Date().toISOString()),
    );
    setStagedStructures([]);

    try {
      const res = await send({
        variables: {
          input: {
            text: text,
            room: room.id,
            agentId: "default",
            attachStructures: attached.length > 0 ? attached : undefined,
          },
        },
      });

      const createdMessage = res.data?.send;

      if (createdMessage) {
        // Accepted — it stops pulsing here and is dropped once the room
        // subscription delivers it.
        setPendingMessages((prev) =>
          confirmPending(prev, localId, createdMessage.id),
        );
        await runReplyer(createdMessage.id);
      } else {
        setPendingMessages((prev) => dropPending(prev, localId));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to send message: ${error.message || error}`);
      // The row goes with the failure: the toast is the record, and a ghost
      // that never resolves would read as sent.
      setPendingMessages((prev) => dropPending(prev, localId));
      setStagedStructures(attached);
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

  // The room caught up: a pending row whose message the list now carries is
  // dropped. `ChatList` already stops rendering it that same frame — this is
  // what keeps the state from growing.
  useEffect(() => {
    setPendingMessages((prev) => settlePending(prev, room.messages));
  }, [room.messages]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[inherit]"
      ref={(node) => {
        drop(node);
      }}
    >
      {isOver && (
        <div className="absolute top-0 left-0 z-50 h-full w-full backdrop-blur-sm">
          <div className="flex items-center justify-center h-full">
            <Card className="p-4">Drop to Add to Chat</Card>
          </div>
        </div>
      )}
      {activeTasks.some((task) => !isSettled(task.status)) && (
        <PillSettler pills={activeTasks} onSettle={setActiveTasks} />
      )}
      <ChatList
        messages={sortedMessages}
        pendingMessages={pendingMessages}
        currentAgentName="default"
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
