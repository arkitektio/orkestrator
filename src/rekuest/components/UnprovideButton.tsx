import React from "react";
import { useAlert } from "../../components/alerter/alerter-context";
import { usePostman } from "../postman/graphql/postman-context";

export type IUnprovideButtonProps = {
  provision: string;
  className: string;
  children: React.ReactNode;
};

const UnprovideButton: React.FC<IUnprovideButtonProps> = ({
  provision,
  children,
  className,
}) => {
  const { unprovide } = usePostman();
  const { alert } = useAlert();

  return (
    <button
      type="button"
      className={
        className ||
        "bg-white hover:bg-gray-400 text-gray-800 font-semibold py-1 px-1 border border-gray-400 rounded shadow"
      }
      onClick={() => {
        unprovide({ variables: { id: provision } })
          .then((res) => console.log(res))
          .catch((reason) => alert({ message: reason.message }));
      }}
    >
      {children}
    </button>
  );
};

export { UnprovideButton };
