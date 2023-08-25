import React, { useEffect } from "react";
import { useGeneralMenu } from "../../providers/command/GeneralMenuContext";
import { useModelSelector } from "../../rekuest/selection/context";

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
