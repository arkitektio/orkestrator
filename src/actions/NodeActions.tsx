import React from "react";
import { useNavigate } from "react-router";
import { ActionButton } from "../layout/ActionButton";
import { RekuestReservation } from "../linker";
import { withRekuest } from "../rekuest";
import { useDeleteNodeMutation } from "../rekuest/api/graphql";
import { useReserver } from "../rekuest/providers/reserver/reserver-context";

export interface NodeActionsProps {
  node?: { id?: string } | null;
}

export const NodeActions: React.FC<NodeActionsProps> = (props) => {
  if (!props.node?.id) return <></>;

  const { reserve } = useReserver();
  const navigate = useNavigate();

  const [deleteNode] = withRekuest(useDeleteNodeMutation)();

  const handlereserve = async () => {
    if (props.node?.id) {
      let x = await reserve({ node: props.node.id });
      x?.id && (await navigate(RekuestReservation.linkBuilder(x.id)));
    }
  };

  return (
    <>
      <ActionButton
        label="Reserve"
        onAction={handlereserve}
        description="Reserve this Node"
      />
      <ActionButton
        label="Delete"
        onAction={async () => {
          if (props.node?.id) {
            await deleteNode({ variables: { id: props.node?.id } });
            await navigate(-1);
          }
        }}
        description="Delete this Node"
      />
    </>
  );
};
