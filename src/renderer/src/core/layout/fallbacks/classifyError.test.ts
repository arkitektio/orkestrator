import { describe, expect, it } from "vitest";
import { classifyError, describeNeeded } from "./classifyError";

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

  describe("denials that name what is missing", () => {
    const denied = (message: string, extensions: Record<string, unknown>) => ({
      message: "wrapped",
      graphQLErrors: [{ message, extensions: { code: "PERMISSION_DENIED", ...extensions } }],
    });

    it("reads a missing scope from the extensions", () => {
      const result = classifyError(
        denied("User does not have the required scopes: ['mikro:write']", {
          reason: "INSUFFICIENT_SCOPE",
          requiredScopes: ["mikro:write"],
        }),
      );
      expect(result.kind).toBe("denied");
      expect(result.denial).toMatchObject({ kind: "scope", needed: ["mikro:write"], any: false, signInHelps: true });
      expect(describeNeeded(result.denial!)).toBe("the mikro:write scope");
    });

    it("reads organization roles, any-of", () => {
      const result = classifyError(
        denied("User does not have any of the required organization roles: admin, approver", {
          reason: "INSUFFICIENT_ORGANIZATION_ROLE",
          requiredAnyOrganizationRoleOf: ["admin", "approver"],
        }),
      );
      expect(result.denial).toMatchObject({ kind: "role", needed: ["admin", "approver"], any: true });
      expect(describeNeeded(result.denial!)).toBe("the admin or approver role");
    });

    it("calls a guest refusal one a new sign-in cannot fix", () => {
      const result = classifyError(denied("This field requires full membership", { reason: "FULL_MEMBERSHIP_REQUIRED" }));
      expect(result.denial).toMatchObject({ kind: "guest", signInHelps: false });
    });

    it("falls back to the directive's words when there is no reason", () => {
      const result = classifyError(gql("User does not have the required roles: admin, editor"));
      expect(result.kind).toBe("denied");
      expect(result.denial).toMatchObject({ kind: "role", reason: "", needed: ["admin", "editor"], any: false });
      expect(describeNeeded(result.denial!)).toBe("the admin and editor roles");
    });

    it("keeps the object-level refusal without a denial", () => {
      const result = classifyError(gql("Not found, or you are not authorized to access it.", "PERMISSION_DENIED"));
      expect(result.kind).toBe("denied");
      expect(result.denial).toBeUndefined();
    });
  });
});
