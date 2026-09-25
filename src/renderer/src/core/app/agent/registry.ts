import { DefinitionInput } from "@/rekuest/api/graphql";
import { AgentFunction, AssignContext, InferDefinition } from "./types";

export type RegistryEntry = {
  name: string
  func: AgentFunction<any>
  definition: DefinitionInput
}

class AgentRegistry {
  entries: RegistryEntry[] = []

  register<
    const D extends DefinitionInput,
    R extends Record<string, unknown> = Record<string, unknown>
  >(name: string, func: AgentFunction<AssignContext<InferDefinition<D>, R>>, definition: D) {
    this.entries.push({ name, func, definition })
  }
}

export const globalRegistry = new AgentRegistry()
