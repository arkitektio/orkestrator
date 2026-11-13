import { IpcMain } from "electron";
import { electronRegistry } from "./agent-registry";
import { Assign } from "./message";
import { registerWatcher } from "./watcher";
import { registerDirectoryChooser } from "./directoryChooser";
import { GraphQLClient } from 'graphql-request';
import { NO_TRUST, trustedFetch, type NodeFetch, type NodeTrust } from './trust/nodeFetch';
import { ImplementationInput as SchemaImplementationInput } from './schemas/rekuest'; // Generated file

type Alias = {
  host: string;
  port?: number | null;
  ssl: boolean;
  path?: string | null;
}

type AvailableService = {
  key: string;
  service: string;
  resolved: Alias;
};

const aliasToUrl = (alias: Alias) => {
    let url = alias.ssl ? "https://" : "http://";
    url += alias.host;
    if (alias.port) {
        url += `:${alias.port}`;
    }
    if (alias.path) {
        url += `/${alias.path}`;
    }
    return url;
}

export class AgentGateway {
  private ipc: IpcMain;
  private token: string | null = null;
  private implementations: SchemaImplementationInput[] = [];
  private cancelControllers: Map<string, AbortController> = new Map();
  private services: Map<string, GraphQLClient> = new Map();
  private readonly fetch: NodeFetch;

  /**
   * `proxyPortForHost` routes a service behind an organisation mesh; `trust` is
   * the certificate policy (`src/main/trust`), so a hub with a self-signed
   * certificate or its own CA is reachable from the agent's functions too.
   */
  constructor(
    ipc: IpcMain,
    proxyPortForHost?: (host: string) => number | undefined,
    trust: NodeTrust = NO_TRUST,
  ) {
    this.ipc = ipc;
    this.fetch = trustedFetch(trust, proxyPortForHost);

    registerWatcher();
    registerDirectoryChooser();
    this.setup();
  }

  setup() {
    this.ipc.handle("agent:inspect-electron-agent", async () => {
      return this.implementations;
    });

    this.ipc.handle("agent:init", async (_, args) => {

        await this.initialize(args);
    });

    this.ipc.handle("agent:execute", async (event, task) => {
        console.log("Executing task", task);
        await this.handleAssign(event.sender, task);
    });

    this.ipc.handle("agent:cancel", async (_, args: { taskId: string }) => {

        const controller = this.cancelControllers.get(args.taskId);
        if (controller) {
            controller.abort();
        }
    });
  }

  public async initialize(context: { token: string, url: string, agentUrl: string, services: AvailableService[] }) {
      this.token = context.token;
      // `agent:init` is sent on every (re)connect; rebuild the list from the
      // registry instead of appending duplicates to the previous run's.
      this.implementations = [];

      const client = new GraphQLClient(context.url, {
          fetch: this.fetch,
          headers: {
              Authorization: `Bearer ${this.token}`,
          }
      });
      this.services.set("rekuest", client);

      if (context.services) {
        context.services.forEach(service => {
            const url = aliasToUrl(service.resolved);
            const serviceClient = new GraphQLClient(url + "/graphql", {
                fetch: this.fetch,
                headers: {
                    Authorization: `Bearer ${this.token}`,
                }
            });
            this.services.set(service.key, serviceClient);
        });
      }

      // Register registry entries
      electronRegistry.entries.forEach(entry => {
          this.implementations.push({
              interface: entry.name,
              definition: entry.definition,
              dependencies: [],
          });
      });
  }

  public async handleAssign(sender: Electron.WebContents, task: Assign) {
    try {
      const entry = electronRegistry.entries.find(e => e.name === task.interface);
      if (!entry) {
          console.error("Function not found", task.interface);
          sender.send("agent:error", { task: task.task, error: `Function not found: ${task.interface}` });
          return;
      }

      const controller = new AbortController();
      this.cancelControllers.set(task.task, controller);

      try {
          await entry.func({
              message: task,
              args: task.args,
              send: () => {
                  // Not implemented for now
              },
              client: this.services.get("rekuest")!,
              yield: (returns) => {
                  sender.send("agent:yield", { task: task.task, returns });
              },
              return: (returns) => {
                  sender.send("agent:done", { task: task.task, returns });
              },
              error: (error) => {
                  sender.send("agent:error", { task: task.task, error });
              },
              log: (level, message) => {
                  sender.send("agent:log", { task: task.task, level, message });
              },
              signal: controller.signal,
          });
      } catch (e) {
          console.error("Error executing function", e);
          sender.send("agent:error", { task: task.task, error: e instanceof Error ? e.message : String(e) });
      }

      this.cancelControllers.delete(task.task);
    }
    catch (e) {
      console.error("Error handling assign", e);
      sender.send("agent:error", { task: task.task, error: e instanceof Error ? e.message : String(e) });
  }
}

}
