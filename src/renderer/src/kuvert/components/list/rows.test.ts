import { describe, expect, it } from "vitest";
import { ListMessageFragment, ListThreadFragment } from "../../api/graphql";
import { participantsLabel, rowsFromThreads } from "./rows";

const a = (name: string, address: string) => ({ name, address });

describe("participantsLabel", () => {
  it("names one participant in full", () => {
    expect(participantsLabel([a("Anna Berg", "anna@x.org")])).toBe("Anna Berg");
  });

  it("uses first names, 'Me' for the mailbox, and folds long lists", () => {
    expect(participantsLabel([a("Anna Berg", "anna@x.org"), a("", "me@x.org")], "ME@x.org")).toBe("Anna, Me");
    expect(
      participantsLabel([a("Anna B", "a@x"), a("Ben C", "b@x"), a("Cleo D", "c@x"), a("", "dan@x")]),
    ).toBe("Anna, Ben & 2 more");
  });
});

describe("rowsFromThreads", () => {
  const thread = (id: string, latest: object | null, unreadCount = 0) =>
    ({
      id,
      messageCount: 2,
      unreadCount,
      flagged: false,
      hasAttachments: true,
      participants: [a("Anna Berg", "anna@x.org")],
      account: { emailAddress: "me@x.org" },
      latestMessage: latest,
    }) as unknown as ListThreadFragment;

  it("previews the newest mail and drops conversations without one in the folder", () => {
    const latest = { id: "m1", senderName: "Anna" } as ListMessageFragment;
    const rows = rowsFromThreads([thread("t1", latest, 1), thread("t2", null)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "t1", kind: "thread", from: "Anna Berg", unread: true, count: 2, attachments: true });
  });
});
