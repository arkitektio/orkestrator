import { ApolloClient, ApolloLink, InMemoryCache, Observable, gql } from "@apollo/client";
import { describe, expect, it } from "vitest";

import { classicPerf, measureCaches } from "./classicPerf";

const THING = gql`
  query Thing {
    thing {
      id
      name
    }
  }
`;

const client = () =>
  new ApolloClient({
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next({ data: { thing: { __typename: "Thing", id: "1", name: "a" } } });
          observer.complete();
        }),
    ),
    cache: new InMemoryCache(),
  });

describe("classicPerf", () => {
  it("counts operations and broadcasts per service while recording, and un-patches on stop", async () => {
    const mikro = client();
    const link = mikro.link;
    const request = link.request;
    const watch = mikro.watchQuery({ query: THING }).subscribe(() => {});
    // Let the watch's own fetch land, or the query below shares it in flight.
    await new Promise((resolve) => setTimeout(resolve, 10));

    classicPerf.start({ mikro: { type: "apollo", client: mikro } });
    await mikro.query({ query: THING, fetchPolicy: "network-only" });
    mikro.cache.writeQuery({ query: THING, data: { thing: { __typename: "Thing", id: "1", name: "b" } } });
    classicPerf.noteCommit("tab-1", false, 3);
    const report = classicPerf.stop();

    expect(report?.operations["mikro · query Thing"]).toBe(1);
    expect(report?.broadcasts.mikro).toBeGreaterThanOrEqual(1);
    expect(report?.commits["tab-1"]).toMatchObject({ hidden: 1, hiddenMs: 3 });
    expect(link.request).toBe(request);
    expect(Object.prototype.hasOwnProperty.call(mikro.cache, "broadcastWatches")).toBe(false);
    expect(classicPerf.isRecording()).toBe(false);
    watch.unsubscribe();
  });

  it("counts nothing when not recording", () => {
    classicPerf.noteCommit("tab-1", true, 5);
    expect(classicPerf.stop()).toBeNull();
  });
});

describe("measureCaches", () => {
  it("sizes each cache and times a gc that frees what nothing reaches", () => {
    const mikro = client();
    const THINGS = gql`
      query Things {
        things {
          id
          name
        }
      }
    `;
    const thing = (id: string) => ({ __typename: "Thing", id, name: id });
    mikro.cache.writeQuery({ query: THINGS, data: { things: [thing("1"), thing("2")] } });
    // The list shrinks: Thing:2 is reachable from nothing any more.
    mikro.cache.writeQuery({ query: THINGS, data: { things: [thing("1")] } });
    const [size] = measureCaches({ mikro: { type: "apollo", client: mikro }, lok: { type: "other" } });
    expect(size).toMatchObject({ service: "mikro", entities: 3, rootFields: 1, collected: 1 });
    expect(size.bytes).toBeGreaterThan(0);
  });
});
