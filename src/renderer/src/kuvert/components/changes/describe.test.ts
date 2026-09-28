import { describe, expect, it } from "vitest";
import { FolderRole, MailChangeKind, MailChangeState } from "../../api/graphql";
import { changeStatus, describeChange } from "./describe";

const change = (over: Partial<Parameters<typeof describeChange>[0]>) => ({
  kind: MailChangeKind.Flags,
  add: [] as string[],
  remove: [] as string[],
  originFolder: null,
  targetFolder: null,
  ...over,
});

describe("describeChange", () => {
  it("names system flags and keywords", () => {
    expect(describeChange(change({ add: ["\\Seen", "$Invoices"], remove: ["\\Flagged"] }))).toBe(
      "Mark read, Add keyword $Invoices, Unflag",
    );
  });

  it("names both folders of a move", () => {
    expect(
      describeChange(
        change({
          kind: MailChangeKind.Move,
          originFolder: { __typename: "MailFolder", id: "1", name: "Inbox", role: FolderRole.Inbox },
          targetFolder: { __typename: "MailFolder", id: "2", name: "Archive", role: FolderRole.Archive },
        }),
      ),
    ).toBe("Move from Inbox to Archive");
  });

  it("names deletes", () => {
    expect(describeChange(change({ kind: MailChangeKind.Expunge }))).toBe("Delete for good");
    expect(describeChange(change({ kind: MailChangeKind.PopDele }))).toBe("Delete on the POP3 server");
  });
});

describe("changeStatus", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  const later = "2026-09-28T12:00:30Z";
  it("tells the undo window from a back-off", () => {
    expect(changeStatus({ state: MailChangeState.Pending, attempts: 0, pushAfter: later }, now)).toBe("undo-window");
    expect(changeStatus({ state: MailChangeState.Pending, attempts: 2, pushAfter: later }, now)).toBe("backing-off");
    expect(changeStatus({ state: MailChangeState.Pending, attempts: 0, pushAfter: "2026-09-28T11:00:00Z" }, now)).toBe("due");
    expect(changeStatus({ state: MailChangeState.Failed, attempts: 5, pushAfter: later }, now)).toBe("failed");
  });
});
