import { beforeEach, describe, expect, it, vi } from "vitest";

const download = vi.hoisted(() => vi.fn(async () => "file.bin"));
vi.mock("@/app/modules/registries", () => ({
  FILE_DOWNLOADERS: {
    "@mikro/file": { identifier: "@mikro/file", service: "mikro", download },
    "@elektro/file": { identifier: "@elektro/file", service: "elektro", download },
  },
}));
// The host itself pulls in the dialog registry; only the handler is under test.
vi.mock("@/app/dialog", () => ({ useDialog: () => ({}) }));
vi.mock("@/lib/arkitekt/provider", () => ({ useConnection: () => null }));
vi.mock("@/providers/download/DownloadProvider", () => ({ useDownload: () => ({}) }));

import { handleExportRequest } from "./ExportHost";

const file = (id: string) => ({ identifier: "@mikro/file", id });
const image = (id: string) => ({ identifier: "@mikro/arraydataset", id });

const run = (structures: ReturnType<typeof file>[]) => {
  const openExportDialog = vi.fn();
  const ctx = { getClient: vi.fn(), startDownload: vi.fn() } as never;
  handleExportRequest(structures, { ctx, openExportDialog });
  return { openExportDialog, ctx };
};

beforeEach(() => vi.clearAllMocks());

describe("bringing dragged-out structures to disk", () => {
  it("downloads a file straight away, without asking", () => {
    const { openExportDialog, ctx } = run([file("1")]);
    expect(download).toHaveBeenCalledWith(ctx, "1");
    expect(openExportDialog).not.toHaveBeenCalled();
  });

  it("asks how to export anything that is not a file", () => {
    const { openExportDialog } = run([image("7")]);
    expect(download).not.toHaveBeenCalled();
    expect(openExportDialog).toHaveBeenCalledWith(image("7"));
  });

  it("downloads every file in a selection, and asks only about the grabbed card", () => {
    const { openExportDialog } = run([image("7"), file("1"), image("8"), file("2")]);
    expect(download.mock.calls.map((call) => (call as unknown[])[1])).toEqual(["1", "2"]);
    expect(openExportDialog).toHaveBeenCalledTimes(1);
    expect(openExportDialog).toHaveBeenCalledWith(image("7"));
  });

  it("asks nothing when the grabbed card is a file", () => {
    const { openExportDialog } = run([file("1"), image("7")]);
    expect(openExportDialog).not.toHaveBeenCalled();
  });
});
