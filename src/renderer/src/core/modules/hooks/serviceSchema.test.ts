import {describe, expect, it} from 'vitest';
import {schemaHash} from './serviceSchema';

/**
 * The vector arkitekt-spec's `tests/declare/test_blok_typing.py` checks too: the
 * two implementations of the schema's shape (graphql-js here, graphql-core
 * there) must hash alike, or every frozen `schemaHash` reads as drifted.
 */
export const VECTOR_SDL = `enum Color { RED GREEN }
interface Node { id: ID! }
type Dataset implements Node @key(fields: "id") { id: ID! name(upper: Boolean): String! tags: [String!]! color: Color }
union Hit = Dataset
input DatasetFilter { name: String ids: [ID!] }
type Query { datasets(filters: DatasetFilter): [Dataset!]! hit: Hit }
`;
const VECTOR_HASH = 'sha256:f92de02a4f48224cb38f968118e5f49c295b0faaaf71f6698ed66efd5a823504';

describe('schemaHash', () => {
  it('hashes the shared vector as the validator does', async () => {
    expect(await schemaHash(VECTOR_SDL)).toBe(VECTOR_HASH);
  });

  it('ignores descriptions, formatting and directives, not a field', async () => {
    const reformatted = `"""Datasets."""\n${VECTOR_SDL.replace(/ \{ /g, ' {\n  ')}`;
    expect(await schemaHash(reformatted)).toBe(VECTOR_HASH);
    expect(await schemaHash(VECTOR_SDL.replace('tags: [String!]!', 'tags: [String]'))).not.toBe(VECTOR_HASH);
  });
});
