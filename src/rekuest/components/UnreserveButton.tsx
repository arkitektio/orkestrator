import React, { ReactNode } from "react";
import { usePostman } from "../postman/graphql/postman-context";

export type IUnreserveButtonProps = {
  reservation: string;
  className: string;
  children: ReactNode;
};

const UnreserveButton: React.FC<IUnreserveButtonProps> = ({
  reservation,
  children,
  className,
}) => {
  const { unreserve } = usePostman();

  return (
    <button
      className={
        className ||
        "bg-white hover:bg-gray-400 text-gray-800 font-semibold py-1 px-1 border border-gray-400 rounded shadow"
      }
      onClick={() => {
        unreserve({ variables: { reservation: reservation } })
          .then((res) => {})
          .catch((reason) => console.error(reason));
      }}
    >
      {children}
    </button>
  );
};

export { UnreserveButton };
