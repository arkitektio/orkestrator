import { gql as parseGql } from "@apollo/client";
import { Kind, type DocumentNode } from "graphql";

/**
 * `gql`, parsed on first use instead of at import.
 *
 * Every service's generated `api/graphql.ts` declares its documents with
 * `gql\`…\`` (codegen's `gqlImport` points here). With graphql-tag's own `gql`
 * all ~2000 of them were parsed while the modules were being imported, about
 * half a second of every window's boot, for documents most sessions never run.
 *
 * The document returned is a stable object (Apollo keys its caches by document
 * identity) whose `definitions` and `loc` parse the text the first time either
 * is read. Embedded fragments are read the same way, so a query forces only
 * the fragments it uses. The first read also turns both accessors into plain
 * data properties, so code that copies a document's descriptors and assigns
 * to the copy (graphql-js `visit` on an edit, Apollo's document transforms)
 * sees an ordinary node. A malformed document therefore throws when it is
 * first used, not when its file is imported.
 */
export function gql(literals: string | readonly string[], ...embeds: unknown[]): DocumentNode {
  let parsed: DocumentNode | undefined;
  const parse = (): DocumentNode => (parsed ??= parseGql(literals, ...embeds));

  const document = { kind: Kind.DOCUMENT };
  for (const key of LAZY_KEYS) {
    Object.defineProperty(document, key, {
      configurable: true,
      enumerable: true,
      get(this: object) {
        const real = parse();
        settle(document, real);
        if (this !== document) settle(this, real);
        return real[key];
      },
      set(this: object, value: unknown) {
        settle(this, parse());
        // A frozen copy keeps its accessor; assigning again would land back here.
        if (!isData(this, key)) throw new TypeError(`Cannot assign to '${key}' of a frozen document`);
        (this as Record<string, unknown>)[key] = value;
      },
    });
  }
  return document as DocumentNode;
}

const LAZY_KEYS = ["definitions", "loc"] as const;

const isData = (target: object, key: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  return !!descriptor && "value" in descriptor;
};

/** Replace the accessors on `target` with the parsed values. */
const settle = (target: object, real: DocumentNode) => {
  for (const key of LAZY_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor || !("get" in descriptor) || !descriptor.configurable) continue;
    Object.defineProperty(target, key, { value: real[key], writable: true, enumerable: true, configurable: true });
  }
};
