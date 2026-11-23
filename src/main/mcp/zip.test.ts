import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { crc32, zipStored } from "./zip";

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });
});

describe("zipStored", () => {
  const files = [
    { path: "manifest.json", content: '{"name":"orkestrator"}' },
    { path: "server/index.js", content: "// Settings → Experiments\n" },
  ];

  it("is the same bytes every time", () => {
    expect(zipStored(files).equals(zipStored(files))).toBe(true);
  });

  // The system's own unzip is the judge of whether this is a ZIP; skipped where there is none.
  const hasUnzip = (() => {
    try {
      execFileSync("unzip", ["-v"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  it.skipIf(!hasUnzip)("is an archive unzip accepts and reads back", () => {
    const path = join(mkdtempSync(join(tmpdir(), "orkestrator-zip-")), "bundle.zip");
    writeFileSync(path, zipStored(files));
    execFileSync("unzip", ["-t", path], { stdio: "ignore" });
    expect(execFileSync("unzip", ["-p", path, "server/index.js"]).toString("utf8")).toBe(files[1].content);
    expect(execFileSync("unzip", ["-p", path, "manifest.json"]).toString("utf8")).toBe(files[0].content);
  });
});
