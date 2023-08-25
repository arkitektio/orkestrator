import React from "react";
import { useNavigate } from "react-router";
import {
  BaseAction,
  Extension,
  useExtension,
} from "../../providers/command/GeneralMenuContext";

export interface NavigationActionsProps {
  navigationActions?: BaseAction[];
}

export const NavigationActions: React.FC<NavigationActionsProps> = ({
  navigationActions = [
    {
      extension: "navigate",
      label: "Home",
      key: "home",
      params: { to: "/" },
      description: "Go to home",
    },
    {
      extension: "navigate",
      label: "Flows",
      key: "flows",
      params: { to: "/flows" },
      description: "Go to Flows",
    },
    {
      extension: "navigate",
      label: "Whales",
      key: "whales",
      params: { to: "/whales" },
      description: "Go to Whales",
    },
    {
      extension: "navigate",
      label: "Teams",
      key: "teams",
      params: { to: "/teams" },
      description: "Go to Whales",
    },
    {
      extension: "navigate",
      key: "data",
      label: "Data",
      params: { to: "/data" },
      description: "Go to Data",
    },
    {
      extension: "navigate",
      key: "back",
      label: "...Back",
      params: { to: -1 },
      description: "Go back in history",
    },
  ],
}) => {
  const navigate = useNavigate();

  const handler: Extension = {
    key: "navigate",
    label: "Navigate to",
    filter: ({ query, modifiers }) => {
      if (modifiers.find((x) => x.key == "search")) {
        return Promise.resolve([]);
      }
      return Promise.resolve(
        navigationActions.filter((action) =>
          action.label.toLowerCase().includes(query.toLowerCase())
        )
      );
    },
    do: async (action) => {
      navigate(action.params?.to);
    },
  };

  useExtension(handler);

  return <></>;
};
