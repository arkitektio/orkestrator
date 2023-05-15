import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { Representation } from "../linker";
import { Actor, useAgent } from "../rekuest/agent/AgentContext";
import {
  NodeKindInput,
  PortKindInput,
  Scope,
  WidgetKind,
} from "../rekuest/api/graphql";

export const MikroDoer: React.FC<{}> = () => {
  const { register } = useAgent();

  const navigate = useNavigate();

  useEffect(() => {
    let token: string;

    let navigateHome = {
      onAssign: async (assign: any) => {
        navigate("/");
      },
    };
    register(
      {
        interface: "navigate_home",
        name: "Navigate Home",
        description: "Navigate to the home page",
        kind: NodeKindInput.Function,
        portGroups: [],
      },
      () => navigateHome
    );

    let representationNavigator: Actor = {
      onAssign: async (helper) => {
        const [rep] = helper.assignation.args;
        navigate(Representation.linkBuilder(rep));
        helper.return([]);
      },
    };

    return register(
      {
        interface: "navigate_representation",
        name: "Navigate to Representaiton",
        description: "Shows the currently active representation",
        kind: NodeKindInput.Function,
        portGroups: [],
        args: [
          {
            key: "representation",
            name: "representation",
            kind: PortKindInput.Structure,
            identifier: "@mikro/representation",
            description: "The representation to navigate to",
            assignWidget: {
              kind: WidgetKind.SearchWidget,
              query:
                "query Search($search: String) { options: representations(name: $search) { value: id label: name } }",
            },
            nullable: false,
            scope: Scope.Global,
          },
        ],
      },
      () => representationNavigator
    );
  }, []);

  return <></>;
};
