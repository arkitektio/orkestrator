import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { ArgPortFragment, ReturnPortFragment } from "./api/graphql";

export type TransportSettings = {
  type: string;
  kwargs: {
    base_urL: string;
  };
};

export type AgentSettings = {
  endpoint_url: string;
  instance_id: string;
};

export type PostmanSettings = {
  endpoint_url: string;
  instance_id: string;
};

export type Rekuest = {
  endpoint_url: string;
  ws_endpoint_url: string;
  healthz: string;
  secure: boolean;
  postman: PostmanSettings;
  agent: AgentSettings;
  instance_id: string;
};

export type RekuestClient = ApolloClient<NormalizedCacheObject>;

export type Args = any[] | [];
export type Returns = any[] | [];
export type Kwargs = { [key: string]: string } | {};

export type ArgPortTypes = ArgPortFragment["__typename"];
export type ReturnPortTypes = ReturnPortFragment["__typename"];

export type PortTypes = ArgPortTypes | ReturnPortTypes;

export type ConnectionPortTypes = ArgPortTypes | ReturnPortTypes;
export type ConnectionPort = ArgPortFragment | ReturnPortFragment;

export type AllPort = ArgPortFragment | ReturnPortFragment;
