import { describe, expect, it } from "vitest";

import {
  profileDetail,
  profileShortDetail,
  profileTitle,
} from "./profileLabels";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";

const profile = (label: Record<string, unknown>) =>
  ({
    identity: { baseUrl: "https://lok.test/lok/f/", userId: "u1", organizationId: "o1" },
    label,
  }) as unknown as StoredProfile;

const full = profile({
  hubName: "Imaging",
  organizationName: "Alpha Lab",
  username: "jhnnsrs",
  deploymentName: "lok.test",
});

describe("profile labels", () => {
  it("leads with the hub, and places it with the organization underneath", () => {
    // Two approvals of one organization differ only by hub, so a list whose
    // first word is the organization says the same thing on every line.
    expect(profileTitle(full)).toBe("Imaging");
    expect(profileDetail(full)).toBe("Alpha Lab · jhnnsrs · lok.test");
  });

  it("gives a card face the organization, since the hub is already the title", () => {
    expect(profileShortDetail(full)).toBe("Alpha Lab");
  });

  it("leads with the organization when there is no hub", () => {
    // A client bound to no hub, or a deployment that does not fill
    // `Context.hub`: nothing about these rows changes.
    const noHub = profile({
      organizationName: "Alpha Lab",
      username: "jhnnsrs",
      deploymentName: "lok.test",
    });

    expect(profileTitle(noHub)).toBe("Alpha Lab");
    expect(profileDetail(noHub)).toBe("jhnnsrs · lok.test");
    expect(profileShortDetail(noHub)).toBe("jhnnsrs");
  });

  it("never repeats the organization it is already showing as the title", () => {
    const noHub = profile({ organizationName: "Alpha Lab", username: "jhnnsrs" });
    expect(profileDetail(noHub)).not.toContain("Alpha Lab");
  });

  it("falls back through slug, deployment and base url", () => {
    expect(profileTitle(profile({ organizationSlug: "alpha" }))).toBe("alpha");
    expect(profileTitle(profile({ deploymentName: "lok.test" }))).toBe("lok.test");
    expect(profileTitle(profile({}))).toBe("https://lok.test/lok/f/");
  });
});
