import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { Representation } from "../linker";
import { AssignMessage, useAgent } from "../rekuest/agent/AgentContext";
import { NodeKindInput, PortKindInput } from "../rekuest/api/graphql";

export const MikroDoer: React.FC<{}> = () => {
  const { register, unregister } = useAgent();

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
      },
      () => navigateHome
    );

    let representationNavigator = {
      onAssign: async (assign: AssignMessage) => {
        const [rep] = assign.args;
        navigate(Representation.linkBuilder(rep));
      },
    };

    register(
      {
        interface: "navigate_representation",
        name: "Navigate to Representaiton",
        description: "Shows the currently active representation",
        kind: NodeKindInput.Function,
        args: [
          {
            key: "representation",
            name: "representation",
            kind: PortKindInput.Structure,
            identifier: "@mikro/representation",
            description: "The representation to navigate to",
            widget: {
              kind: "SearchWidget",
              query:
                "query Search($search: String) { options: representations(name: $search) { value: id label: name } }",
            },
            nullable: false,
          },
        ],
      },
      () => representationNavigator
    );

    return () => {
      unregister(token);
    };
  }, []);

  return <></>;
};
