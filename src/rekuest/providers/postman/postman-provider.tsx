import React from "react";
import { Postman, PostmanContext } from "./postman-context";

export type PostmanProviderProps = {
  allowBatch?: boolean;
  staticPostman?: Postman;
  children: React.ReactNode;
};

const NO_POSTMAN_SET = "We are still using a dead postman...";

const deadPostman: Postman = {
  reserve: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  provide: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unreserve: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unprovide: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  assign: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  ack: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
  unassign: async () => {
    throw new Error(NO_POSTMAN_SET);
  },
};

export const PostmanProvider: React.FC<PostmanProviderProps> = ({
  children,
  staticPostman = deadPostman,
}) => {
  const [postman, setPostman] = React.useState<any>(staticPostman);

  return (
    <PostmanContext.Provider
      value={{
        ...postman,
        setPostman: setPostman,
      }}
    >
      {children}
    </PostmanContext.Provider>
  );
};
