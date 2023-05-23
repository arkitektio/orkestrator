import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { v4 } from "uuid";
import { withRekuest } from "../RekuestContext";
import { RekuestGuard } from "../RekuestGuard";
import {
  AssignationStatus,
  DefinitionInput,
  LogLevelInput,
  ProvisionStatus,
  useTemplateMutation,
} from "../api/graphql";
import {
  ActorBuilder,
  ActorBuilderRegistry,
  AgentContext,
  AgentInMessage,
  AgentOutMessage,
  AssignHelpers,
  AssignMessage,
  AssignationsRegistry,
  ListProvisionsProvision,
  ProvisionRegistry,
} from "./AgentContext";
export type ArkitektProps = { children: React.ReactNode; instanceId?: string };

let actorRegistry = {};

export const TrueAgentProvider: React.FC<ArkitektProps> = ({
  children,
  instanceId = "main",
}) => {
  const [provide, setProvide] = useState<boolean>(false);

  const { fakts } = useFakts();
  const { token } = useHerre();

  const [template] = withRekuest(useTemplateMutation)();

  const [definitionRegistry, setDefinitionRegistry] = useState<{
    [id: string]: DefinitionInput | undefined;
  }>({});
  const [actorRegistry, setActorRegistry] = useState<{
    [id: string]: ActorBuilder | undefined;
  }>({});

  const [templateActorMap, setTemplateActorMap] = useState<{
    [id: string]: ActorBuilder;
  }>({});

  const [registry, setRegistry] = useState<ActorBuilderRegistry>({});
  const [provisions, setProvisions] = useState<ProvisionRegistry>({});
  const [assignations, setAssignations] = useState<AssignationsRegistry>({});

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${fakts.rekuest.agent.endpoint_url}?token=${token}&instance_id=${instanceId}`,
    {},
    provide
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN && provide) {
      sendMessage(JSON.stringify({ type: "LIST_PROVISIONS", id: "1" }));
    }
  }, [readyState, provide]);

  const startProvide = async () => {
    console.log("Start providing");
    let definitions = Object.entries(definitionRegistry);
    let actors: { [template_id: string]: ActorBuilder } = {};
    for (let [key, definition] of definitions) {
      if (key && definition) {
        let t = await template({
          variables: {
            interface: key,
            definition: definition,
            instanceId: instanceId,
          },
        });
        if (!t.data?.createTemplate) {
          throw Error("Could not create template");
        }
        console.log(key);
        console.log(actorRegistry);
        let actor = actorRegistry[key];
        if (actor) {
          actors[t.data.createTemplate.id] = actor;
        } else {
          throw Error("Mismatch in tempalte");
        }
      }
    }

    setTemplateActorMap(actors);
    setProvide(true);
    console.log("Providing", actors, definitions);
  };

  const cancelProvide = async () => {
    setProvide(false);
    console.log("Providingin....");
  };

  useEffect(() => {
    if (lastMessage !== null) {
      let decoded = JSON.parse(lastMessage.data) as AgentInMessage;
      console.warn("NEW AGENT MESSAGE", decoded);

      switch (decoded.type) {
        case "LIST_PROVISIONS_REPLY":
          console.log("LIST_PROVISIONS_REPLY", decoded);

          decoded.provisions.forEach((provision) => {
            onProvisionIn(provision).then((x) =>
              setProvisions((prev) => ({
                ...prev,
                [x.provision.toString()]: x.actor,
              }))
            );
          });

          break;

        case "LIST_ASSIGNATIONS_REPLY":
          console.log("LIST_ASSIGNATIONS_REPLY", decoded);
          break;

        case "ASSIGN":
          console.log("LIST_ASSIGNATIONS_REPLY", decoded);
          onAssignationIn(decoded).then((x) => console.log(x));
          break;
      }
    }
  }, [lastMessage]);

  const rep = (message: AgentOutMessage) => {
    console.log("SENDING AGENT MESSAGE", message);
    sendMessage(JSON.stringify(message));
  };

  const onProvisionIn = async (provision: ListProvisionsProvision) => {
    const { provision: provisionId, template: templateId } = provision;

    const actorBuilder = templateActorMap[templateId];
    if (!actorBuilder) {
      rep({
        id: v4(),
        type: "PROVIDE_CHANGED",
        provision: provisionId,
        status: ProvisionStatus.Critical,
        message: "Actor not found",
      });
      throw Error("Actor not found");
    }

    const actor = actorBuilder();

    if (actor.onProvide) {
      try {
        await actor.onProvide(provision);
        rep({
          id: v4(),
          type: "PROVIDE_CHANGED",
          provision: provisionId,
          status: ProvisionStatus.Active,
          message: "Provisioned",
        });
      } catch (e: any) {
        rep({
          id: v4(),
          type: "PROVIDE_CHANGED",
          provision: provisionId,
          status: ProvisionStatus.Critical,
          message: e.message ?? "Unknown error",
        });
        return { provision: provisionId, actor: actor };
      }
    } else {
      rep({
        id: v4(),
        type: "PROVIDE_CHANGED",
        provision: provisionId,
        status: ProvisionStatus.Active,
        message: "Actor is now active",
      });
    }
    return { provision: provisionId, actor: actor };
  };

  const onAssignationIn = (assignation: AssignMessage) => {
    const { provision: provisionId, assignation: assignationID } = assignation;

    console.log(provisions);

    const controller = new AbortController();

    const actor = provisions[provisionId.toString()];
    if (!actor) {
      rep({
        id: v4(),
        type: "ASSIGN_CHANGED",
        assignation: assignationID,
        status: AssignationStatus.Critical,
        message: "Actor was never provided",
      });
      console.log(provisions, provisionId);
      return Promise.reject("Actor was never provided");
    }

    const helpers: AssignHelpers = {
      yield: async (returns: any) => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Yield,
          returns: returns ?? [],
        });
      },
      return: async (returns: any) => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Returned,
          returns: returns ?? [],
        });
      },
      done: async () => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Done,
        });
      },
      progress: async (value: number) => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Progress,
          progress: value,
        });
      },
      log: async (level: LogLevelInput, message?: string) => {
        rep({
          id: v4(),
          type: "ASSIGN_LOG",
          assignation: assignationID,
          level: level,
          message: message,
        });
      },
      abortController: controller,
      assignation: assignation,
    };

    const future = actor.onAssign(helpers).catch((e: any) => {
      rep({
        id: v4(),
        type: "ASSIGN_CHANGED",
        assignation: assignationID,
        status: AssignationStatus.Error,
        message: e.message || "Unknown error",
      });
    });
    setAssignations((prev) => ({
      ...prev,
      [assignationID]: { future, abortController: controller },
    }));

    return future;
  };

  const register = (
    on_interface: string,
    definition: DefinitionInput,
    actor: ActorBuilder
  ) => {
    setDefinitionRegistry((registry) => ({
      ...registry,
      [on_interface]: definition,
    }));
    setActorRegistry((registry) => ({
      ...registry,
      [on_interface]: actor,
    }));

    console.log("REGISTER", on_interface, definition, actor);

    return () => {
      setDefinitionRegistry((registry) => ({
        ...registry,
        [on_interface]: undefined,
      }));
      setActorRegistry((registry) => ({
        ...registry,
        [on_interface]: undefined,
      }));
    };
  };

  return (
    <AgentContext.Provider
      value={{
        register: register,
        startProvide: startProvide,
        cancelProvide: cancelProvide,
        provide: provide,
        registry: registry,
        provisions: provisions,
        assignations: assignations,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

const NoAgentProvider = ({ children }: { children: React.ReactNode }) => {
  const failureFunc = async (...args: any[]): Promise<any> => {
    console.log("No Postman Provider", args);
    throw Error("No Postman Provider");
  };

  return (
    <AgentContext.Provider
      value={{
        register: () => {
          return () => {};
        },
        cancelProvide: failureFunc,
        startProvide: failureFunc,
        provide: false,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const AgentProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <RekuestGuard fallback={<NoAgentProvider>{children}</NoAgentProvider>}>
      <TrueAgentProvider>{children}</TrueAgentProvider>
    </RekuestGuard>
  );
};
