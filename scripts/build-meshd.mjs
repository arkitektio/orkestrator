// Builds the mesh sidecar (tools/meshd, Go) into resources/meshd/<os>-<arch>/,
// where electron-builder's `extraResources` picks it up. Pure Go, no cgo, so
// any host cross-compiles for any target:
//
//   node scripts/build-meshd.mjs                 # host platform
//   node scripts/build-meshd.mjs mac arm64       # one target
//   node scripts/build-meshd.mjs all             # every shipped target
//   node scripts/build-meshd.mjs --if-missing    # only when not built yet
//
// `--if-missing` is what `pnpm dev` runs first: it skips when the binary is
// already there, and a failed build (no Go toolchain, …) only warns, since the
// app runs without the sidecar (the mesh reports "binary-missing"). It does
// not notice edited Go sources; run `pnpm build:meshd` after changing them.
//
// The directory names use electron-builder's ${os}/${arch} vocabulary (mac,
// win, linux / x64, arm64) so electron-builder.yml can reference them.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
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

const args = process.argv.slice(2);
const ifMissing = args.includes("--if-missing");
const [a, b] = args.filter((arg) => !arg.startsWith("--"));
const targets = a === "all" ? ALL : [[a ?? hostOs, b ?? hostArch]];

for (const [os, arch] of targets) {
  if (!GOOS[os] || !GOARCH[arch]) {
    if (ifMissing) {
      console.warn(`meshd: no sidecar for ${os}/${arch}, the mesh will be unavailable`);
      continue;
    }
    throw new Error(`unknown target ${os}/${arch}`);
  }
  const dir = join(OUT, `${os}-${arch}`);
  const bin = join(dir, os === "win" ? "meshd.exe" : "meshd");
  if (ifMissing && existsSync(bin)) continue;
  mkdirSync(dir, { recursive: true });
  console.log(`meshd → ${os}/${arch}`);
  try {
    execFileSync("go", ["build", "-trimpath", "-ldflags", "-s -w", "-o", bin, "."], {
      cwd: SRC,
      stdio: "inherit",
      env: { ...process.env, GOOS: GOOS[os], GOARCH: GOARCH[arch], CGO_ENABLED: "0" },
    });
  } catch (error) {
    if (!ifMissing) throw error;
    const why = error.code === "ENOENT" ? "Go is not installed" : "the build failed";
    console.warn(`meshd: ${why}, the mesh will be unavailable (retry with \`pnpm build:meshd\`)`);
  }
}
