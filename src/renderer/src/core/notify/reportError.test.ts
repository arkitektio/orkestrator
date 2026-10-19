import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it } from "vitest";

import { describeError, NO_REASON } from "./describeError";
import { reportError, reportErrorAs, wasReported } from "./reportError";
import { resetToasts, toastStore } from "./toasts";

const gql = (message: string, code?: string) =>
  new ApolloError({
    graphQLErrors: [new GraphQLError(message, { path: ["createFolder"], extensions: code ? { code } : undefined })],
  });

beforeEach(() => resetToasts());

describe("describeError", () => {
  it("keeps the server's sentence and moves code and path to technical", () => {
    const described = describeError(gql("Folder name is taken", "CONFLICT"));
    expect(described).toMatchObject({ kind: "unknown", message: "Folder name is taken" });
    expect(described.technical).toBe("Folder name is taken | CONFLICT | path: createFolder");
  });

  it("names the kinds a person can act on", () => {
    expect(describeError(gql("nope", "FORBIDDEN")).message).toBe("You're not allowed to do this.");
    expect(describeError(gql("x", "UNAUTHENTICATED")).message).toBe("Your session ran out. Sign in again.");
    expect(
      describeError(new ApolloError({ networkError: Object.assign(new Error("boom"), { statusCode: 502 }) })).message,
    ).toBe("Couldn't reach the server.");
    expect(describeError(new TypeError("Failed to fetch")).kind).toBe("network");
  });

  it("reads plain errors, strings and nothing", () => {
    expect(describeError(new Error("plain")).message).toBe("plain");
    expect(describeError("said so").message).toBe("said so");
    expect(describeError(undefined).message).toBe(NO_REASON);
    expect(describeError("").message).toBe(NO_REASON);
  });

  it("takes an error that describes itself as it is", () => {
    const own = Object.assign(new Error("Agent is offline."), { technical: "AGENT_OFFLINE", kind: "unknown" });
    expect(describeError(own)).toEqual({ kind: "unknown", message: "Agent is offline.", technical: "AGENT_OFFLINE" });
  });
});

describe("reportError", () => {
  it("raises one error toast: the title, the sentence, the details", () => {
    const error = gql("Folder name is taken");
    reportError(error, "Couldn't create the folder");
    const [toast] = toastStore.getState().toasts;
    expect(toast).toMatchObject({ kind: "error", message: "Couldn't create the folder", description: "Folder name is taken" });
    expect(toast.technical).toContain("path: createFolder");
    expect(wasReported(error)).toBe(true);
  });

  it("replaces by id, and curries for a catch", () => {
    reportErrorAs({ title: "A", id: "site" })(new Error("one"));
    reportErrorAs({ title: "A", id: "site" })(new Error("two"));
    expect(toastStore.getState().toasts.map((t) => t.description)).toEqual(["two"]);
  });

  it("ignores a cancellation", () => {
    reportError(Object.assign(new Error("aborted"), { name: "AbortError" }), "Nope");
    expect(toastStore.getState().toasts).toEqual([]);
  });
});
