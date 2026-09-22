// Builds the mesh sidecar (tools/meshd, Go) into resources/meshd/<os>-<arch>/,
// where electron-builder's `extraResources` picks it up. Pure Go, no cgo, so
// any host cross-compiles for any target:
//
//   node scripts/build-meshd.mjs                 # host platform
//   node scripts/build-meshd.mjs mac arm64       # one target
//   node scripts/build-meshd.mjs all             # every shipped target
//
// The directory names use electron-builder's ${os}/${arch} vocabulary (mac,
// win, linux / x64, arm64) so electron-builder.yml can reference them.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "tools", "meshd");
const OUT = join(ROOT, "resources", "meshd");

const GOOS = { mac: "darwin", win: "windows", linux: "linux" };
const GOARCH = { x64: "amd64", arm64: "arm64" };
const ALL = [
  ["mac", "arm64"],
  ["mac", "x64"],
  ["win", "x64"],
  ["win", "arm64"],
  ["linux", "x64"],
  ["linux", "arm64"],
];

const hostOs = { darwin: "mac", win32: "win", linux: "linux" }[process.platform];
const hostArch = process.arch === "arm64" ? "arm64" : "x64";

const [a, b] = process.argv.slice(2);
const targets = a === "all" ? ALL : [[a ?? hostOs, b ?? hostArch]];

for (const [os, arch] of targets) {
  if (!GOOS[os] || !GOARCH[arch]) throw new Error(`unknown target ${os}/${arch}`);
  const dir = join(OUT, `${os}-${arch}`);
  mkdirSync(dir, { recursive: true });
  const bin = join(dir, os === "win" ? "meshd.exe" : "meshd");
  console.log(`meshd → ${os}/${arch}`);
  execFileSync("go", ["build", "-trimpath", "-ldflags", "-s -w", "-o", bin, "."], {
    cwd: SRC,
    stdio: "inherit",
    env: { ...process.env, GOOS: GOOS[os], GOARCH: GOARCH[arch], CGO_ENABLED: "0" },
  });
}
