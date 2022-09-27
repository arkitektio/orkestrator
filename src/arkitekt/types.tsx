import { ArgPortFragment, ReturnPortFragment } from "./api/graphql";

export type ArgPortTypes = ArgPortFragment["__typename"];
export type ReturnPortTypes = ReturnPortFragment["__typename"];

export type PortTypes = ArgPortTypes | ReturnPortTypes;

export type ConnectionPortTypes = ArgPortTypes | ReturnPortTypes;
export type ConnectionPort = ArgPortFragment | ReturnPortFragment;

export type AllPort = ArgPortFragment | ReturnPortFragment;
