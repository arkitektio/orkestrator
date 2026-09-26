import { describe, expect, it } from "vitest";
import { FolderRole } from "./api/graphql";
import {
  formatMailDate,
  forwardSubject,
  parseRecipients,
  quoteForReply,
  replyRecipients,
  replySubject,
  sortFolders,
} from "./format";

describe("parseRecipients", () => {
  it("reads bare, angled and named addresses", () => {
    expect(parseRecipients("a@x.org, <b@x.org>; Carol <c@x.org>")).toEqual({
      recipients: [{ address: "a@x.org" }, { address: "b@x.org" }, { name: "Carol", address: "c@x.org" }],
      invalid: [],
    });
  });

  it("keeps a comma inside a quoted name", () => {
    expect(parseRecipients('"Doe, Jane" <jane@x.org>, bob@x.org').recipients).toEqual([
      { name: "Doe, Jane", address: "jane@x.org" },
      { address: "bob@x.org" },
    ]);
  });

  it("reports what is not an address", () => {
    expect(parseRecipients("jane, bob@x.org,").invalid).toEqual(["jane"]);
  });
});

describe("subjects", () => {
  it("does not stack prefixes", () => {
    expect(replySubject("Re: RE: Aw: Lunch")).toBe("Re: Lunch");
    expect(forwardSubject("Fwd: Lunch")).toBe("Fwd: Lunch");
    expect(replySubject("Lunch")).toBe("Re: Lunch");
  });
});

describe("replyRecipients", () => {
  const message = {
    sender: { name: "Ann", address: "ann@x.org" },
    replyTo: [],
    to: [{ address: "me@x.org" }, { address: "bob@x.org" }],
    cc: [{ address: "cat@x.org" }, { address: "ANN@x.org" }],
  };

  it("answers the sender", () => {
    expect(replyRecipients(message, "me@x.org", false)).toEqual({ to: [message.sender], cc: [] });
  });

  it("answers everyone but oneself, once each", () => {
    expect(replyRecipients(message, "ME@x.org", true)).toEqual({
      to: [message.sender],
      cc: [{ address: "bob@x.org" }, { address: "cat@x.org" }],
    });
  });

  it("prefers Reply-To", () => {
    const withReplyTo = { ...message, replyTo: [{ address: "list@x.org" }] };
    expect(replyRecipients(withReplyTo, "me@x.org", false).to).toEqual([{ address: "list@x.org" }]);
  });

  it("answers one's own sent mail to its recipients", () => {
    const sent = { ...message, sender: { address: "me@x.org" }, cc: [] };
    expect(replyRecipients(sent, "me@x.org", false).to).toEqual([{ address: "bob@x.org" }]);
  });
});

describe("quoteForReply", () => {
  it("quotes every line", () => {
    const quoted = quoteForReply({
      textBody: "hi\n> earlier\n",
      sender: { address: "ann@x.org" },
      subject: "s",
      to: [],
      cc: [],
    });
    expect(quoted.endsWith("wrote:\n> hi\n>> earlier")).toBe(true);
  });
});

describe("sortFolders", () => {
  it("puts the inbox first and trash last", () => {
    const sorted = sortFolders([
      { role: FolderRole.Trash, path: "Trash" },
      { role: FolderRole.Other, path: "Receipts" },
      { role: FolderRole.Inbox, path: "INBOX" },
      { role: FolderRole.Sent, path: "Sent" },
    ]);
    expect(sorted.map((f) => f.path)).toEqual(["INBOX", "Sent", "Trash", "Receipts"]);
  });
});

describe("formatMailDate", () => {
  const now = new Date(2026, 8, 26, 15, 0);
  it("says yesterday and weekdays within the week", () => {
    expect(formatMailDate(new Date(2026, 8, 25, 9).toISOString(), now)).toBe("Yesterday");
    expect(formatMailDate(new Date(2026, 8, 22, 9).toISOString(), now)).toBe(
      new Date(2026, 8, 22).toLocaleDateString(undefined, { weekday: "long" }),
    );
  });
  it("is empty without a date", () => {
    expect(formatMailDate(null, now)).toBe("");
  });
});
