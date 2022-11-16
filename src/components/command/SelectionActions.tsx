import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useModelSelector } from "../../rekuest/selection/context";
import { useGeneralMenu } from "./GeneralMenuContext";

export interface NavigationActionsProps {}

export const SelectionActions: React.FC<NavigationActionsProps> = ({}) => {
  const { setModifiers } = useGeneralMenu();

  const { selection, isMultiSelecting } = useModelSelector();

  useEffect(() => {
    if (selection.length >= 1 && isMultiSelecting) {
      setModifiers((modifiers) => [
        ...modifiers.filter((x) => x.key !== "selection"),
        { key: "selection", label: "Selection", params: selection },
      ]);
    } else {
      setModifiers((modifiers) =>
        modifiers.filter((x) => x.key !== "selection")
      );
    }
  }, [selection, isMultiSelecting]);

  return <></>;
};
