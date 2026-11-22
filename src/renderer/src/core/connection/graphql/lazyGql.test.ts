import { gql as eagerGql, InMemoryCache } from "@apollo/client";
import { addTypenameToDocument, getOperationName } from "@apollo/client/utilities";
import { Kind, print, visit } from "graphql";
import { describe, expect, it } from "vitest";
import { gql } from "./lazyGql";

const makeDocs = () => {
  const PersonFragmentDoc = gql`
    fragment Person on Person {
      id
      name
    }
  `;
  const GetPersonDocument = gql`
    query GetPerson($id: ID!) {
      person(id: $id) {
        ...Person
      }
    }
    ${PersonFragmentDoc}
  `;
  return { PersonFragmentDoc, GetPersonDocument };
};

describe("lazy gql", () => {
  it("does not parse until the document is read", () => {
    // Malformed: graphql-tag would throw right here.
    const broken = gql`query {`;
    expect(broken.kind).toBe(Kind.DOCUMENT);
    expect(() => broken.definitions).toThrow();
  });

  it("parses to what graphql-tag parses, fragments included", () => {
    const { GetPersonDocument } = makeDocs();
    const eagerFragment = eagerGql`
      fragment Person on Person {
        id
        name
      }
    `;
    const eager = eagerGql`
      query GetPerson($id: ID!) {
        person(id: $id) {
          ...Person
        }
      }
      ${eagerFragment}
    `;
    expect(print(GetPersonDocument)).toBe(print(eager));
    expect(getOperationName(GetPersonDocument)).toBe("GetPerson");
    expect(GetPersonDocument.loc?.source.body).toContain("fragment Person");
  });

  it("is one stable object whose accessors settle into data", () => {
    const { GetPersonDocument } = makeDocs();
    const first = GetPersonDocument.definitions;
    expect(GetPersonDocument.definitions).toBe(first);
    const descriptor = Object.getOwnPropertyDescriptor(GetPersonDocument, "definitions");
    expect(descriptor && "value" in descriptor).toBe(true);
  });

  it("survives a visit that edits a never-read document", () => {
    // graphql-js copies the node's descriptors and assigns the edited
    // `definitions` to the copy: an accessor without a setter would throw.
    const { GetPersonDocument } = makeDocs();
    const copy = Object.defineProperties({}, Object.getOwnPropertyDescriptors(GetPersonDocument));
    expect(() => ((copy as { definitions: unknown }).definitions = [])).not.toThrow();

    const fresh = makeDocs().GetPersonDocument;
    const renamed = visit(fresh, {
      Field: (node) => (node.name.value === "name" ? { ...node, name: { ...node.name, value: "title" } } : undefined),
    });
    expect(print(renamed)).toContain("title");
    expect(print(fresh)).not.toContain("title");
  });

  it("goes through Apollo's document transform and cache", () => {
    const { GetPersonDocument } = makeDocs();
    expect(print(addTypenameToDocument(GetPersonDocument))).toContain("__typename");

    const cache = new InMemoryCache();
    cache.writeQuery({
      query: GetPersonDocument,
      variables: { id: "1" },
      data: { person: { __typename: "Person", id: "1", name: "Ada" } },
    });
    expect(cache.readQuery({ query: GetPersonDocument, variables: { id: "1" } })).toEqual({
      person: { __typename: "Person", id: "1", name: "Ada" },
    });
  });
});
