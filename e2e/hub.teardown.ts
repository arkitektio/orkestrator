import { test as teardown } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { konstruktor, readState } from "./fixtures/hub";

teardown("the hub this run made is removed", async () => {
  teardown.setTimeout(300_000);
  const state = readState();
  // An adopted hub (E2E_HUB_DIR) is the user's: left as it is.
  if (!state?.created) return;
  try {
    konstruktor(["destroy", state.dir, "--yes", "--local-only"], state.registry, 300_000);
  } catch {
    // Not registered (create failed half-way): its containers and volumes still go.
    execFileSync("docker", ["compose", "down", "--volumes", "--remove-orphans"], { cwd: state.dir, stdio: "inherit" });
  }
});
