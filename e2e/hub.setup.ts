import { test as setup } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { konstruktor, readAccess, writeState } from "./fixtures/hub";

/** The services the hub runs: what the module walk visits (lok comes with every hub). */
export const HUB_SERVICES = ["rekuest", "mikro", "fluss", "kabinet", "kraph"];

const freePort = () =>
  new Promise<number>((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? done(address.port) : fail(new Error("no port"))));
    });
  });

setup("a self-contained hub is up", async () => {
  setup.setTimeout(900_000);
  const adopted = process.env.E2E_HUB_DIR;
  if (adopted) {
    const dir = resolve(adopted);
    readAccess(dir); // fails early when the folder is not a hub
    writeState({ dir, registry: null, created: false });
    return;
  }

  // A run of its own: its own registry (the user's hubs stay out of it) and a
  // unique folder, which is also the compose project name.
  const scratch = mkdtempSync(join(tmpdir(), "orkestrator-e2e-hub-"));
  const registry = join(scratch, "registry");
  const dir = join(scratch, `e2e-${Date.now().toString(36)}`);
  writeState({ dir, registry, created: true });
  const port = await freePort();
  konstruktor(
    [
      "hub", "create", dir,
      "--server", "local",
      "--plain-http",
      "--http-port", String(port),
      "--services", HUB_SERVICES.join(","),
      "--org", "demo",
      "--user", "demo",
      "--user-password", "e2e-demo-password",
      "--mandate-keys", "1",
      "--no-plugin-engine",
      "--no-open",
      "--no-start",
      "--yes",
    ],
    registry,
  );
  konstruktor(["up", dir], registry);
  konstruktor(["wait", dir, "--timeout", "600"], registry);
});
