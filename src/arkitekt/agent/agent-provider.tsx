import { preventOverflow } from "@popperjs/core";
import React, { useEffect, useState } from "react";
import { v4 } from "uuid";
import { Assign } from "yup/lib/object";
import { useFakts } from "../../fakts";
import { useHerre } from "../../herre";
import {
  AssignationStatus,
  DefinitionInput,
  ProvisionStatus,
  useDefineMutation,
  useTemplateMutation,
} from "../api/graphql";
import { withArkitekt } from "../arkitekt";
import {
  ActorBuilder,
  ActorBuilderRegistry,
  AgentContext,
  AgentInMessage,
  AgentOutMessage,
  AssignationsRegistry,
  AssignMessage,
  ListProvisionsProvision,
  ProvisionRegistry,
  Replier,
} from "./agent-context";
export type ArkitektProps = { children: React.ReactNode };
import useWebSocket, { ReadyState } from "react-use-websocket";

export const AgentProvider: React.FC<ArkitektProps> = ({ children }) => {
  const [provide, setProvide] = useState<boolean>(false);

  const { fakts } = useFakts();
  const { token } = useHerre();

  const [define] = withArkitekt(useDefineMutation)();
  const [template] = withArkitekt(useTemplateMutation)();

  const [registry, setRegistry] = useState<ActorBuilderRegistry>({});
  const [provisions, setProvisions] = useState<ProvisionRegistry>({});
  const [assignations, setAssignations] = useState<AssignationsRegistry>({});
  const [ws, setWebsocket] = useState<WebSocket | undefined>(undefined);

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${fakts.arkitekt.agent.endpoint_url}?token=${token}`
  );

  useEffect(() => {
    if (readyState === ReadyState.OPEN && provide) {
      sendMessage(JSON.stringify({ type: "LIST_PROVISIONS", id: "1" }));
    }
  }, [readyState, provide]);

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

    const actorBuilder = registry[templateId];
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

    const controller = new AbortController();
    const future = actor
      .onAssign(assignation, controller)
      .then((returns) => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Returned,
          returns: returns ?? [],
          message: "Actor was never provided",
        });
      })
      .catch((e: any) => {
        rep({
          id: v4(),
          type: "ASSIGN_CHANGED",
          assignation: assignationID,
          status: AssignationStatus.Error,
          message: e.message ?? "Unknown error",
        });
      });
    setAssignations((prev) => ({
      ...prev,
      [assignationID]: { future, abortController: controller },
    }));

    return future;
  };

  const register = async (definition: DefinitionInput, actor: ActorBuilder) => {
    const node = await define({ variables: { definition: definition } });
    if (!node.data?.define?.id) {
      throw new Error("Definition failed");
    }
    const temp = await template({
      variables: { node: node.data?.define?.id },
    });
    if (!temp.data?.createTemplate?.id) {
      throw new Error("Templating failed");
    }

    setRegistry((registry) => ({
      ...registry,
      [temp.data?.createTemplate?.id as string]: actor,
    }));
    return temp.data?.createTemplate?.id;
  };

  const unregister = (id: string) => {
    setRegistry({ ...registry, [id]: undefined });
  };

  return (
    <AgentContext.Provider
      value={{
        register: register,
        unregister: unregister,
        setProvide: setProvide,
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
