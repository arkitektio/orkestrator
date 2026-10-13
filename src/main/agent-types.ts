import { GraphQLClient } from "graphql-request";
import type { Assign, FromAgentMessage } from "./message";
import { ArgPortInput as PortInput, DefinitionInput, PortKind } from "./schemas/rekuest";


export type ScalarType<T extends PortKind> =
  T extends PortKind.String ? string :
  T extends PortKind.Int ? number :
  T extends PortKind.Float ? number :
  T extends PortKind.Bool ? boolean :
  T extends PortKind.Date ? string :
  T extends PortKind.Enum ? string :
  T extends PortKind.Model ? string : string

export type InferPortType<P extends PortInput> =
  P['kind'] extends PortKind.Structure ? (
    P['children'] extends ReadonlyArray<PortInput> ? InferArgs<P['children']> : unknown
  ) :
  P['kind'] extends PortKind.List ? (
    P['children'] extends ReadonlyArray<PortInput> ? Array<InferPortType<P['children'][0]>> : unknown[]
  ) :
  ScalarType<P['kind']>;

export type InferArgs<P extends ReadonlyArray<PortInput>> = {
  [K in P[number]['key']]: InferPortType<Extract<P[number], { key: K }>>
}

export type InferDefinition<D extends DefinitionInput> = D['args'] extends ReadonlyArray<PortInput> ? InferArgs<D['args']> : Record<string, unknown>;

export type ElectronAssignContext<A extends { [key: string]: unknown } = Record<string, unknown>, R extends { [key: string]: unknown } = Record<string, unknown>> = {
  message: Assign;
  args: A;
  send: (msg: FromAgentMessage) => void;
  client: GraphQLClient;
  yield: (returns: R) => void;
  return: (returns: R) => void;
  error: (error: string) => void;
  log: (level: string, message: string) => void;
  signal: AbortSignal;
};

export type ElectronAgentFunction<T extends ElectronAssignContext<Record<string, unknown>, never>> = (
  context: T,
) => void;
