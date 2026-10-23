import {
  buildSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
  type GraphQLNamedType,
} from "graphql";

/**
 * A service's GraphQL schema as plain data, and its hash: what a blok's
 * frozen `services` entry (`schemaHash`) is compared with.
 *
 * The validator that froze it (arkitekt-spec `declare/blok/graphql.py`,
 * `schema_shape`) builds the same data with graphql-core. The printed SDL is
 * no common ground: graphql-js and graphql-core print it differently. So both
 * sides take every named type, its fields with their arguments, members and
 * values, by name, each type as GraphQL writes it (`[ID!]!`), and leave out
 * descriptions, directives and defaults, which change no answer a blok reads.
 * `serviceSchema.test.ts` holds a vector both test suites check.
 */

type Shape = Record<string, Record<string, unknown>>;

const byName = <T,>(entries: [string, T][]): Record<string, T> =>
  Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const kindOf = (named: GraphQLNamedType): string => {
  if (isObjectType(named)) return "OBJECT";
  if (isInterfaceType(named)) return "INTERFACE";
  if (isUnionType(named)) return "UNION";
  if (isEnumType(named)) return "ENUM";
  if (isInputObjectType(named)) return "INPUT_OBJECT";
  if (isScalarType(named)) return "SCALAR";
  throw new Error(`A schema type of no known kind: ${String(named)}`);
};

export const schemaShape = (sdl: string): Shape => {
  // A federation subgraph names directives (`@key`) it does not declare: the
  // schema is taken as the service serves it.
  const schema = buildSchema(sdl, { assumeValidSDL: true });
  const types: Shape = {};
  for (const [name, named] of Object.entries(schema.getTypeMap())) {
    if (name.startsWith("__")) continue;
    const entry: Record<string, unknown> = { kind: kindOf(named) };
    if (isObjectType(named) || isInterfaceType(named)) {
      entry.fields = byName(
        Object.entries(named.getFields()).map(([fieldName, field]) => [
          fieldName,
          { type: String(field.type), args: byName(field.args.map((arg) => [arg.name, String(arg.type)])) },
        ]),
      );
      entry.interfaces = named
        .getInterfaces()
        .map((iface) => iface.name)
        .sort();
    } else if (isInputObjectType(named)) {
      entry.fields = byName(Object.entries(named.getFields()).map(([fieldName, field]) => [fieldName, String(field.type)]));
    } else if (isUnionType(named)) {
      entry.types = named
        .getTypes()
        .map((member) => member.name)
        .sort();
    } else if (isEnumType(named)) {
      entry.values = named
        .getValues()
        .map((value) => value.name)
        .sort();
    }
    types[name] = entry;
  }
  return types;
};

/** JSON with every object's keys sorted and no whitespace: Python's `json.dumps(sort_keys=True, separators=(",", ":"))`. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

/** `sha256:<hex>` of the schema's shape, as the validator froze it. */
export const schemaHash = async (sdl: string): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalJson(schemaShape(sdl)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
};
