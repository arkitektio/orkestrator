import React from "react";
import { useNavigate } from "react-router";
import { usePostman } from "../arkitekt/postman/graphql/postman-context";
import { useReserver } from "../arkitekt/postman/reserver/reserver-context";
import { ActionButton } from "../layout/ActionButton";
import { Reservation } from "../linker";

export interface NodeActionsProps {
  node?: { id?: string } | null;
}

export const NodeActions: React.FC<NodeActionsProps> = (props) => {
  if (!props.node?.id) return <></>;

  const { reserve } = useReserver();
  const navigate = useNavigate();

  const handlereserve = async () => {
    if (props.node?.id) {
      let x = await reserve({ node: props.node.id });
      x?.id && (await navigate(Reservation.linkBuilder(x.id)));
    }
  };

  return (
    <>
      <ActionButton
        label="Reserve"
        onAction={handlereserve}
        description="Reserve this Node"
      />
    </>
  );
};
