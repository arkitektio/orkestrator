import React from "react";
import { usePostman } from "../postman/graphql/postman-context";

export type IUnassignButtonProps = {
  assignation: string;
  className: string;
  children?: React.ReactNode;
};

const UnassignButton: React.FC<IUnassignButtonProps> = ({
  assignation,
  children,
  className,
}) => {
  const { unassign } = usePostman();

  return (
    <button
      className={
        className ||
        "bg-white hover:bg-gray-400 text-gray-800 font-semibold py-1 px-1 border border-gray-400 rounded shadow"
      }
      onClick={() => {
        unassign({ variables: { assignation: assignation } })
          .then((res) => {})
          .catch((reason) => console.error(reason));
      }}
    >
      {children}
    </button>
  );
};

export { UnassignButton };
