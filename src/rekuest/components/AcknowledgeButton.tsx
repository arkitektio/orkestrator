import React from "react";
import { usePostman } from "../postman/graphql/postman-context";

export type IUnassignButtonProps = {
  assignation: string;
  className: string;
  children: React.ReactNode;
};

const AcknowledgeButton: React.FC<IUnassignButtonProps> = ({
  assignation,
  children,
  className,
}) => {
  const { ack } = usePostman();

  return (
    <button
      className={
        className ||
        "bg-white hover:bg-gray-400 text-gray-800 font-semibold py-1 px-1 border border-gray-400 rounded shadow"
      }
      onClick={() => {
        ack({ variables: { assignation: assignation } })
          .then((res: any) => {})
          .catch((reason: any) => console.error(reason));
      }}
    >
      {children}
    </button>
  );
};

export { AcknowledgeButton };
