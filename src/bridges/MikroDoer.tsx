import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAgent } from "../rekuest/agent/AgentContext";
import { NodeKindInput } from "../rekuest/api/graphql";

export const MikroDoer: React.FC<{}> = () => {
  const { register } = useAgent();

  const navigate = useNavigate();

  useEffect(() => {
    let navigateHome = {
      onAssign: async (assign: any) => {
        navigate("/");
      },
    };
    return register(
      "navigate-home",
      {
        name: "Navigate Home",
        description: "Navigate to the home page",
        kind: NodeKindInput.Function,
        args: [],
        returns: [],
        portGroups: [],
        interfaces: [],
      },
      () => navigateHome
    );
  }, []);

  return <></>;
};
