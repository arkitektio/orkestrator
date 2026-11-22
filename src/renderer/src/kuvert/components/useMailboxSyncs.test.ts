import { describe, expect, it } from "vitest";
import { syncTouches } from "./useMailboxSyncs";

const sync = { accountId: "a1", folders: ["f1", "f2"] };

describe("syncTouches", () => {
  it("reads a folder's list again only when the sync changed that folder", () => {
    expect(syncTouches(sync, "ListThreads", { filters: { folder: "f1" } })).toBe(true);
    expect(syncTouches(sync, "ListThreads", { filters: { folder: "f9" } })).toBe(false);
    expect(syncTouches(sync, "ListThreads", { inFolder: "f2" })).toBe(true);
  });

  it("leaves another mailbox's lists and pages alone", () => {
    expect(syncTouches(sync, "ListMessages", { filters: { account: "a2" } })).toBe(false);
    expect(syncTouches(sync, "GetMailAccount", { id: "a2" })).toBe(false);
    expect(syncTouches(sync, "GetMailAccount", { id: "a1" })).toBe(true);
    expect(syncTouches(sync, "GetMailFolder", { id: "f9" })).toBe(false);
    expect(syncTouches(sync, "ListMailChanges", { filters: { account: "a2" } })).toBe(false);
  });

  it("reads lists across mailboxes and the mailbox tree again", () => {
    expect(syncTouches(sync, "ListThreads", { filters: {} })).toBe(true);
    expect(syncTouches(sync, "ListMessages", { filters: { account: "a1" } })).toBe(true);
    expect(syncTouches(sync, "MailboxTree", undefined)).toBe(true);
  });
});
