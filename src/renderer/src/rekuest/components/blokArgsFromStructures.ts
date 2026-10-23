import type { Structure } from "@/core/types";
import { PortKind } from "@/rekuest/api/graphql";
import type { BlokArgs } from "./blokArgs";

type ArgPortLike = {
  key: string;
  kind: PortKind;
  identifier?: string | null;
  children?: readonly { kind: PortKind; identifier?: string | null }[] | null;
};

const asValue = (structure: Structure) => ({ __identifier: structure.identifier, object: structure.id });

/**
 * What a blok shown next to other objects (a chat message's attachments) is
 * opened for: each structure arg takes the one object of its identifier, a
 * list of structures every one of them. An arg with no such object, or with
 * several for a single slot, is left out: the blok asks for it as it would
 * anywhere else. Matched by identifier only; the objects carry no descriptors
 * to check an arg's `requires` against.
 */
export const blokArgsFromStructures = (ports: readonly ArgPortLike[], structures: readonly Structure[]): BlokArgs => {
  const args: BlokArgs = {};
  for (const port of ports) {
    if (port.kind === PortKind.Structure && port.identifier) {
      const matches = structures.filter((structure) => structure.identifier === port.identifier);
      if (matches.length === 1) args[port.key] = asValue(matches[0]);
      continue;
    }
    const item = port.kind === PortKind.List ? port.children?.[0] : undefined;
    if (item?.kind === PortKind.Structure && item.identifier) {
      const matches = structures.filter((structure) => structure.identifier === item.identifier);
      if (matches.length > 0) args[port.key] = matches.map(asValue);
    }
  }
  return args;
};
