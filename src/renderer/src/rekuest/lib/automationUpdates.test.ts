import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client";
import { parse } from "graphql";
import { describe, expect, it } from "vitest";
import { REKUEST_TYPE_POLICIES } from "@/core/connection/graphql/cachePolicies";
import rekuestResult from "../api/fragments";
import { type RuleChangeFragment, type SignalChangeFragment, SignalKind } from "../api/graphql";
import { applyRuleEvent, firingFeedNeedsRefetch, signalFeedNeedsRefetch } from "./automationUpdates";

const client = () => {
  const apollo = new ApolloClient({
    link: ApolloLink.empty(),
    cache: new InMemoryCache({ possibleTypes: rekuestResult.possibleTypes, typePolicies: REKUEST_TYPE_POLICIES }),
  });
  apollo.cache.writeFragment({
    id: "Schedule:3",
    fragment: parse(`
      fragment S on Schedule {
        id
        name
        enabled
        consecutiveFailures
        lastError
        runCount
        lastFiredAt
        updatedAt
      }
    `),
    data: { __typename: "Schedule", id: "3", name: "nightly", enabled: true, consecutiveFailures: 0, lastError: null, runCount: 4, lastFiredAt: null, updatedAt: "t0" },
  });
  return apollo;
};

const change = (fields: Partial<RuleChangeFragment>): RuleChangeFragment => ({
  __typename: "RuleChange",
  id: "3",
  name: "nightly",
  enabled: true,
  consecutiveFailures: 0,
  lastError: null,
  runCount: 4,
  lastFiredAt: null,
  updatedAt: "t1",
  ...fields,
});

describe("applyRuleEvent", () => {
  it("writes a run in place and asks nothing again", () => {
    const apollo = client();
    expect(applyRuleEvent(apollo, "Schedule", { update: change({ runCount: 5, lastFiredAt: "t1" }) })).toBe(false);
    expect(apollo.cache.extract()["Schedule:3"]).toMatchObject({ runCount: 5, lastFiredAt: "t1" });
  });

  it("asks again for a new rule, and for a change to what the lists order and filter by", () => {
    expect(applyRuleEvent(client(), "Schedule", { create: change({ id: "9" }) })).toBe(true);
    expect(applyRuleEvent(client(), "Schedule", { update: change({ consecutiveFailures: 1 }) })).toBe(true);
    expect(applyRuleEvent(client(), "Schedule", { update: change({ enabled: false }) })).toBe(true);
  });

  it("drops a deleted rule without asking again", () => {
    const apollo = client();
    expect(applyRuleEvent(apollo, "Schedule", { delete: "3" })).toBe(false);
    expect(apollo.cache.extract()["Schedule:3"]).toBeUndefined();
  });
});

const signal = (fields: Partial<SignalChangeFragment>): SignalChangeFragment => ({
  __typename: "SignalChange",
  id: "1",
  service: "mikro",
  kind: SignalKind.Created,
  identifier: "@mikro/image",
  object: "12",
  receivedAt: "t0",
  processedAt: null,
  fired: 0,
  ...fields,
});

describe("signalFeedNeedsRefetch", () => {
  it("asks again for a signal that may belong in the feed, not for one its filters rule out", () => {
    expect(signalFeedNeedsRefetch({ create: signal({}) }, {})).toBe(true);
    expect(signalFeedNeedsRefetch({ create: signal({}) }, { identifier: "@mikro/table" })).toBe(false);
    expect(signalFeedNeedsRefetch({ create: signal({}) }, { kind: [SignalKind.Deleted] })).toBe(false);
    // Nothing fired yet: an arrival cannot be in a "fired something" feed.
    expect(signalFeedNeedsRefetch({ create: signal({}) }, { matched: true })).toBe(false);
  });

  it("asks again after matching only when it fired something or the feed is about matching", () => {
    expect(signalFeedNeedsRefetch({ update: signal({ processedAt: "t1" }) }, {})).toBe(false);
    expect(signalFeedNeedsRefetch({ update: signal({ processedAt: "t1", fired: 2 }) }, {})).toBe(true);
    expect(signalFeedNeedsRefetch({ update: signal({ processedAt: "t1" }) }, { matched: false })).toBe(true);
  });
});

describe("firingFeedNeedsRefetch", () => {
  it("asks again once triggers were matched, never for an arrival", () => {
    expect(firingFeedNeedsRefetch({ create: signal({}) })).toBe(false);
    expect(firingFeedNeedsRefetch({ update: signal({ processedAt: "t1" }) })).toBe(true);
  });
});
