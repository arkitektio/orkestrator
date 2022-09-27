import React from "react";
import { useHerre } from "../../herre/herre-context";

interface Props {}

export const LoginButton: React.FC<Props> = (props: Props) => {
  const { login } = useHerre();

  return (
    <>
      <div>
        <button
          className="outline-gray-200 flex text-sm rounded-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
          onClick={() => login()}
        >
          <span className="sr-only">Login</span>
          <span className="px- py-2 text-gray-800">Login</span>
        </button>
      </div>
    </>
  );
};
