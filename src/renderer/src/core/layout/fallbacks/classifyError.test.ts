import { describe, expect, it } from "vitest";
import { classifyError } from "./classifyError";

const gql = (message: string, code?: string) => ({
  message: "wrapped",
  graphQLErrors: [{ message, extensions: code ? { code } : {}, path: ["dataset"] }],
});

describe("classifyError", () => {
  it("reads the services' uniform refusal as denied", () => {
    const result = classifyError(gql("Not found, or you are not authorized to access it."));
    expect(result.kind).toBe("denied");
    expect(result.technical).toContain("path: dataset");
  });

  it("reads a FORBIDDEN code as denied whatever the words", () => {
    expect(classifyError(gql("nope", "FORBIDDEN")).kind).toBe("denied");
  });

  it("goes by the transport status first", () => {
    const network = (statusCode: number) => ({
      message: "failed",
      networkError: Object.assign(new Error("Response not successful"), { statusCode }),
    });
    expect(classifyError(network(401)).kind).toBe("unauthenticated");
    expect(classifyError(network(403)).kind).toBe("denied");
    expect(classifyError(network(502))).toMatchObject({ kind: "network", statusCode: 502 });
  });

  it("calls a request that never completed a network error", () => {
    expect(classifyError({ message: "x", networkError: new Error("Failed to fetch") })).toMatchObject({
      kind: "network",
      statusCode: null,
      message: "Failed to fetch",
    });
  });

  it("reads an authentication message as unauthenticated", () => {
    expect(classifyError(gql("Authentication required")).kind).toBe("unauthenticated");
  });

  it("leaves everything else unknown, with the server's message", () => {
    expect(classifyError(gql("division by zero"))).toMatchObject({ kind: "unknown", message: "division by zero" });
    expect(classifyError(undefined)).toMatchObject({ kind: "unknown", message: "Unknown error" });
  });
});
