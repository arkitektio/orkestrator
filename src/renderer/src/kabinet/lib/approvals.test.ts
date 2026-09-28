import { describe, expect, it } from "vitest";
import { approvalStatus, releaseRequirements, reusableApproval } from "./approvals";

const approval = (over: Partial<Parameters<typeof reusableApproval>[0][number]> & { id: string }) => ({
  agent: "live.arkitekt.deployer",
  isActive: true,
  isStale: false,
  revokedAt: null,
  approver: { sub: "me" },
  ...over,
});

describe("approvalStatus", () => {
  it("ranks revoked over stale over active", () => {
    expect(approvalStatus({ isActive: true, isStale: false })).toBe("active");
    expect(approvalStatus({ isActive: false, isStale: true })).toBe("stale");
    expect(approvalStatus({ isActive: false, isStale: true, revokedAt: "2026-09-01" })).toBe("revoked");
  });
});

describe("reusableApproval", () => {
  const approvals = [
    approval({ id: "someone-else", approver: { sub: "other" } }),
    approval({ id: "stale", isActive: false, isStale: true }),
    approval({ id: "other-agent", agent: "org.other.deployer" }),
    approval({ id: "mine" }),
  ];

  it("picks only the signed-in user's active approval for this agent", () => {
    expect(reusableApproval(approvals, "live.arkitekt.deployer", "me")?.id).toBe("mine");
  });

  it("finds none without a signed-in user or a matching agent", () => {
    expect(reusableApproval(approvals, "live.arkitekt.deployer", null)).toBeUndefined();
    expect(reusableApproval(approvals, "org.nobody", "me")).toBeUndefined();
  });
});

describe("releaseRequirements", () => {
  it("unions by key, optional only if optional everywhere, required first", () => {
    const result = releaseRequirements([
      { requirements: [{ key: "mikro", service: "live.arkitekt.mikro", optional: true }] },
      {
        requirements: [
          { key: "mikro", service: "live.arkitekt.mikro", optional: false, description: "Images" },
          { key: "kraph", service: "live.arkitekt.kraph", optional: true },
          { key: "rekuest", service: "live.arkitekt.rekuest", optional: false },
        ],
      },
    ]);
    expect(result.map((r) => [r.key, r.optional])).toEqual([
      ["mikro", false],
      ["rekuest", false],
      ["kraph", true],
    ]);
    expect(result[0].description).toBe("Images");
  });
});
