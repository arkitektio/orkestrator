import { AppContext } from '@/core/lib/arkitekt/provider'
import { DefinitionInput, ArgPortInput, PortKind } from '@/rekuest/api/graphql'
import { Assign, FromAgentMessage } from './message'

export type ScalarType<T extends PortKind> = T extends PortKind.String
  ? string
  : T extends PortKind.Int
    ? number
    : T extends PortKind.Float
      ? number
      : T extends PortKind.Bool
        ? boolean
        : T extends PortKind.Date
          ? string
          : T extends PortKind.Enum
            ? string
            : T extends PortKind.Model
              ? string
              : string

export type InferPortType<P extends ArgPortInput> = P['kind'] extends PortKind.Structure
  ? P['children'] extends ReadonlyArray<ArgPortInput>
    ? InferArgs<P['children']>
    : unknown
  : P['kind'] extends PortKind.List
    ? P['children'] extends ReadonlyArray<ArgPortInput>
      ? Array<InferPortType<P['children'][0]>>
      : unknown[]
    : ScalarType<P['kind']>

export type InferArgs<P extends ReadonlyArray<ArgPortInput>> = {
  [K in P[number]['key']]: InferPortType<Extract<P[number], { key: K }>>
}

export type InferDefinition<D extends DefinitionInput> =
  D['args'] extends ReadonlyArray<ArgPortInput> ? InferArgs<D['args']> : Record<string, unknown>

export type AssignContext<
  A extends { [key: string]: unknown } = Record<string, unknown>,
  R extends { [key: string]: unknown } = Record<string, unknown>
> = {
  message: Assign
  args: A
  send: (msg: FromAgentMessage) => void
  app: AppContext
  controller?: AbortController
  yield: (returns: R) => void
  return: (returns: R) => void
  navigate: (path: string) => void
  error: (error: string) => void
}

export type AgentFunction<T extends AssignContext<Record<string, unknown>, never>> = (
  context: T
) => void | Promise<void>
