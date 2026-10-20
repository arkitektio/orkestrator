import { ApolloError } from "@apollo/client";
import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";

import { toastStore } from "@/core/notify/toasts";
import { AssignError, assignErrorMessage, notifyAssignError, toAssignError } from "./assignError";

const graphQLError = (message: string, code?: string) =>
  new ApolloError({
    graphQLErrors: [new GraphQLError(message, { path: ["assign"], extensions: code ? { code } : undefined })],
  });

describe("toAssignError", () => {
  it("keeps the server's sentence and moves code and path to the technical line", () => {
    const failure = toAssignError(graphQLError("Agent stage-1 is not connected", "AGENT_UNREACHABLE"));

    expect(failure).toBeInstanceOf(AssignError);
    expect(failure.message).toBe("Agent stage-1 is not connected");
    expect(failure.code).toBe("AGENT_UNREACHABLE");
    expect(failure.technical).toContain("AGENT_UNREACHABLE");
    expect(failure.technical).toContain("path: assign");
  });

  it("says rekuest is unreachable for a transport failure", () => {
    const failure = toAssignError(new ApolloError({ networkError: new Error("Failed to fetch") }));

    expect(failure.kind).toBe("network");
    expect(failure.message).toBe("Rekuest could not be reached.");
    expect(failure.technical).toContain("Failed to fetch");
  });

  it("says the user may not run it when the server denies", () => {
    expect(toAssignError(graphQLError("nope", "FORBIDDEN")).message).toBe("You are not allowed to run this.");
  });

  it("has a sentence when nothing came back", () => {
    expect(toAssignError(undefined).message).toBe("Rekuest refused the task without saying why.");
  });

  it("is idempotent", () => {
    const failure = toAssignError(graphQLError("boom"));
    expect(toAssignError(failure)).toBe(failure);
  });
});

describe("assignErrorMessage", () => {
  it("reads any thrown value", () => {
    expect(assignErrorMessage(toAssignError(graphQLError("boom")))).toBe("boom");
    expect(assignErrorMessage(new Error("plain"))).toBe("plain");
    expect(assignErrorMessage(null)).toBe("Rekuest refused the task without saying why.");
  });
});

describe("notifyAssignError", () => {
  it("raises one toast keyed by the site", () => {
    notifyAssignError(toAssignError(graphQLError("boom")), { id: "site" });

    notifyAssignError(toAssignError(graphQLError("boom again")), { id: "site" });

    const toasts = toastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id: "site", kind: "error", message: "Couldn't run the task", description: "boom again" });
    expect(toasts[0].technical).toContain("path: assign");
  });
});
