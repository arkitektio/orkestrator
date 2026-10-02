import { describe, expect, it } from "vitest";
import { ListDependencyFragment } from "../api/graphql";
import { buildDependenciesSchema } from "./useImplementationForm";

const dependency = (overrides: Partial<ListDependencyFragment>): ListDependencyFragment => ({
  id: "1",
  key: "stage",
  description: null,
  appFilter: null,
  versionFilter: null,
  autoResolvable: false,
  optional: false,
  minViableInstances: null,
  maxViableInstances: null,
  singular: false,
  ...overrides,
});

const bound = (count: number) => [
  {
    key: "stage",
    mappedAgents: Array.from({ length: count }, (_, i) => ({ agent: String(i), key: "stage" })),
  },
];

describe("buildDependenciesSchema", () => {
  it("refuses a required dependency left unbound", () => {
    expect(buildDependenciesSchema([dependency({})]).safeParse([]).success).toBe(false);
  });

  it("lets an optional dependency stay unbound, whatever its minimum", () => {
    const schema = buildDependenciesSchema([dependency({ optional: true, minViableInstances: 2 })]);
    expect(schema.safeParse([]).success).toBe(true);
  });

  it("still holds a bound optional dependency to its minimum", () => {
    const schema = buildDependenciesSchema([dependency({ optional: true, minViableInstances: 2 })]);
    expect(schema.safeParse(bound(1)).success).toBe(false);
    expect(schema.safeParse(bound(2)).success).toBe(true);
  });

  it("keeps the pins of the levels below", () => {
    const schema = buildDependenciesSchema([dependency({})]);
    const pins = [
      {
        key: "stage",
        mappedAgents: [
          {
            agent: "0",
            key: "stage",
            dependencies: [{ key: "motor", mappedAgents: [{ agent: "1", key: "motor" }] }],
          },
        ],
      },
    ];
    expect(schema.parse(pins)).toEqual(pins);
  });
});
