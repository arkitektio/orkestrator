import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { parse } from "graphql";
import { describe, expect, it } from "vitest";
import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import rekuestResult from "../../api/fragments";
import { type AgentChangeFragment, AgentKind } from "../../api/graphql";
import { AGENT_LIST_QUERIES, AGENT_REGISTRATION_QUERIES, agentListsToRefetch, applyAgentScalars, removeAgentFromLists } from "./AgentUpdater";

const LISTS = parse(`
  query Lists {
    pinned: agents(filters: { pinned: true }) {
      id
      name
      connected
    }
    all: agents {
      id
      name
      connected
    }
  }
`);

const agent = (id: string, connected: boolean) => ({ __typename: "Agent", id, name: `agent ${id}`, connected });

const client = () => {
  const apollo = new ApolloClient({
    link: ApolloLink.empty(),
    cache: new InMemoryCache({ possibleTypes: rekuestResult.possibleTypes, typePolicies: REKUEST_TYPE_POLICIES }),
  });
  apollo.writeQuery({ query: LISTS, data: { pinned: [agent("1", false)], all: [agent("1", false), agent("2", true)] } });
  return apollo;
};

const change = (id: string, connected: boolean): AgentChangeFragment => ({
  __typename: "AgentChange",
  id,
  name: `agent ${id}`,
  kind: AgentKind.Websocket,
  connected,
  blocked: false,
  lastSeen: null,
  client: "c",
  user: "u",
  organization: "o",
  app: "a",
  release: "r",
});

describe("the agents feed", () => {
  it("writes a change onto the agent every list shows, and says when it came back", () => {
    const apollo = client();
    expect(applyAgentScalars(apollo, change("1", true))).toBe(true);
    expect(apollo.readQuery<{ pinned: { connected: boolean }[] }>({ query: LISTS })?.pinned[0].connected).toBe(true);
    expect(applyAgentScalars(apollo, change("1", true))).toBe(false);
    expect(applyAgentScalars(apollo, change("2", false))).toBe(false);
  });

  it("never writes a new agent into a filtered list: the lists are asked again", () => {
    const apollo = client();
    expect(agentListsToRefetch({ create: change("3", true) }, false)).toBe(AGENT_LIST_QUERIES);
    expect(apollo.readQuery<{ pinned: { id: string }[] }>({ query: LISTS })?.pinned.map((row) => row.id)).toEqual(["1"]);
  });

  it("asks again only the registration-dependent lists when an agent comes back, nothing for other updates", () => {
    expect(agentListsToRefetch({ update: change("1", true) }, true)).toBe(AGENT_REGISTRATION_QUERIES);
    expect(agentListsToRefetch({ update: change("1", true) }, false)).toEqual([]);
  });

  it("takes a deleted agent out of every list", () => {
    const apollo = client();
    removeAgentFromLists(apollo, "1");
    const lists = apollo.readQuery<{ pinned: { id: string }[]; all: { id: string }[] }>({ query: LISTS });
    expect(lists?.pinned).toEqual([]);
    expect(lists?.all.map((row) => row.id)).toEqual(["2"]);
  });
});
