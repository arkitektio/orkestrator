import { describe, expect, it } from "vitest";
import {
  approvalStatus,
  deployableApprovals,
  deployerApps,
  hostsOf,
  isApprovalInstaller,
  releaseRequirements,
  reusableApproval,
} from "./approvals";

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

describe("deployableApprovals", () => {
  it("keeps every active approval of mine, whatever the deployer", () => {
    const approvals = [
      approval({ id: "a" }),
      approval({ id: "b", agent: "org.other.deployer" }),
      approval({ id: "theirs", approver: { sub: "other" } }),
      approval({ id: "revoked", revokedAt: "2026-09-01" }),
      approval({ id: "stale", isActive: false, isStale: true }),
    ];
    expect(deployableApprovals(approvals, "me").map((a) => a.id)).toEqual(["a", "b"]);
    expect(deployableApprovals(approvals, null)).toEqual([]);
  });
});

describe("deployer apps and hosts", () => {
  const host = (id: string, app: string, name: string, connected: boolean) => ({
    id,
    agent: { name, connected, app: { identifier: app } },
  });
  const installers = [
    host("1", "b.deployer", "zeta", false),
    host("2", "a.deployer", "alpha", false),
    host("3", "b.deployer", "beta", true),
  ];

  it("lists each deployer app once, ones with a connected host first", () => {
    expect(deployerApps(installers)).toEqual(["b.deployer", "a.deployer"]);
  });

  it("lists an app's hosts, connected first", () => {
    expect(hostsOf(installers, "b.deployer").map((h) => h.id)).toEqual(["3", "1"]);
    expect(hostsOf(installers, "c.deployer")).toEqual([]);
  });
});

describe("isApprovalInstaller", () => {
  const args = (...nullable: boolean[]) => ({ action: { args: nullable.map((n) => ({ nullable: n })) } });

  it("accepts an action that needs only the approval", () => {
    expect(isApprovalInstaller(args(false))).toBe(true);
    expect(isApprovalInstaller(args(false, true, true))).toBe(true);
  });

  it("rejects one that needs more than the approval", () => {
    expect(isApprovalInstaller(args(false, false))).toBe(false);
  });
});
