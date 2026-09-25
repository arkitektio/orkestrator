import { NO_RECONNECT_CODES } from "@/core/constants";
import { aliasToWsPath } from "@/core/lib/arkitekt/alias/helpers";
import type { AppContext } from "@/core/lib/arkitekt/provider";
import type { AvailableService } from "@/core/lib/arkitekt/types";
import { TokenResponse } from "@/core/lib/arkitekt/fakts/tokenSchema";
import { selectAlias, selectApolloClient } from "@/core/lib/arkitekt/utils";
import { DefinitionInput, EnsureAgentDocument, EnsureAgentMutation, EnsureAgentMutationVariables, ImplementAgentDocument, ImplementAgentMutation, ImplementAgentMutationVariables, ImplementationInput} from "@/rekuest/api/graphql";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  AgentMode,
  Assign,
  CancelledEvent,
  CancelMessage,
  CompletedEvent,
  CriticalEvent,
  EventAck,
  FailedEvent,
  FromAgentMessage,
  Init,
  ProgressEvent,
  Register,
  StartedEvent,
  ToAgentMessage,
  YieldEvent,
} from "./message";
import { globalRegistry } from "./registry";
import { expandArgs, shrinkReturns, SerPort } from "./serialization";
import { AgentFunction, AssignContext, InferDefinition } from "./types";

export type AgentState = {
  assignments: Assign[];
  errors: string[];
  connected: boolean;
  lastCode?: number;
  lastReason?: string;
}

export type AgentListener = (state: AgentState) => void;

type RegisteredAgentContext = AssignContext<
  Record<string, unknown>,
  Record<string, unknown>
>;

type RegisteredAgentFunction = (context: RegisteredAgentContext) => void | Promise<void>;

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 3000;
const RETRY_RESET_MS = 10000;

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === "AbortError";
};

const getAccessToken = (token: TokenResponse | string) => {
  if (typeof token === "string") {
    return token;
  }

  if (token.access_token) {
    return token.access_token;
  }

  throw new Error("No access token available for agent connection");
};

// Cap the retained error history so a long-lived connection that keeps hitting
// websocket errors doesn't accumulate strings without bound.
const MAX_AGENT_ERRORS = 50;

export class OrkestratorAgent {
  context: AppContext;
  rekuestClient: ApolloClient<NormalizedCache>;
  ws: WebSocket | null = null;
  cancelControllers: Map<string, AbortController> = new Map();
  requestControllers: Set<AbortController> = new Set();
  electronListeners: Map<string, (type: string, data: unknown) => void> = new Map();
  electronUnsubscribers: Array<() => void> = [];
  registry: Map<string, RegisteredAgentFunction> = new Map();
  // Interface → published definition, used to (de)serialize a task's args/returns.
  definitions: Map<string, DefinitionInput> = new Map();
  implementations: ImplementationInput[] = [];
  // Electron implementations are inspected once; announce() runs on every connect
  // (incl. reconnects) so guard against re-inspecting/re-registering them.
  private electronRegistered = false;
  reconnectTimer: NodeJS.Timeout | null = null;
  stableConnectionTimer: NodeJS.Timeout | null = null;
  shouldReconnect = true;
  reconnectAttempts = 0;
  token: string
  agentUrl: string;
  navigate: (path: string) => void;

  // Per-process identity: a stable session_id across transient reconnects tells
  // the backend the process survived (reclaim in-flight work). A fresh
  // OrkestratorAgent (app reload) mints a new one → fail-and-cascade.
  sessionId: string = crypto.randomUUID();
  // Monotonic per-connection stream sequence for at-least-once event dedup.
  private nextSeq = 0;
  // Terminal reports retained until the backend EVENT_ACKs them; resent on
  // reconnect (persist-then-ack). Keyed by the report's event id.
  private unackedEvents: Map<string, FromAgentMessage> = new Map();

  assignments: Assign[] = [];
  errors: string[] = [];
  connected: boolean = false;
  lastCode?: number;
  lastReason?: string;
  listeners: AgentListener[] = [];

  constructor(
    context: AppContext,
    navigate: (path: string) => void
  ) {
    this.context = context;
    this.navigate = navigate;
    this.rekuestClient = selectApolloClient(context, "rekuest");
    this.agentUrl = aliasToWsPath(selectAlias(
      this.context,
      "rekuest"
    ), `agi`
    );

    if (this.context.connection == undefined) {
      throw new Error("No connection in context");
    }

    this.token = getAccessToken(this.context.connection.token)

    if (window.api) {
      // Capture the disposers so disconnect() can remove these IPC listeners —
      // a new agent is built on every connection change, so without this each
      // reconnect leaks four IPC callbacks closing over the dead agent.
      this.electronUnsubscribers.push(
        window.api.onAgentYield((data) => this.notifyElectronListener(data.task, "yield", data)),
        window.api.onAgentDone((data) => this.notifyElectronListener(data.task, "done", data)),
        window.api.onAgentError((data) => this.notifyElectronListener(data.task, "error", data)),
        window.api.onAgentLog((data) => this.notifyElectronListener(data.task, "log", data)),
      );
    }

    // Register global registry entries
    globalRegistry.entries.forEach((entry) => {
      this.register(entry.name, entry.func, entry.definition);
    });
  }

  /**
   * Update the live app context (and thus token) in place, WITHOUT reconnecting.
   * Called by AgentProvider on token refresh so a future reconnect uses the
   * current token while the existing socket stays up. The endpoint is stable, so
   * the Apollo client / agent URL do not change.
   */
  public setContext(context: AppContext) {
    this.context = context;
    try {
      if (context.connection) {
        this.token = getAccessToken(context.connection.token);
      }
    } catch {
      // Keep the previous token if the refreshed context has none yet.
    }
  }

  public subscribe(listener: AgentListener) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): AgentState {
    return {
      assignments: this.assignments,
      errors: this.errors,
      connected: this.connected,
      lastCode: this.lastCode,
      lastReason: this.lastReason,
    };
  }

  public register<const D extends DefinitionInput, R extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    func: AgentFunction<AssignContext<InferDefinition<D>, R>>,
    definition: D,
  ) {
    this.registry.set(name, func as RegisteredAgentFunction);
    this.definitions.set(name, definition);
    // Idempotent per interface: an interface is unique per agent, so re-registering
    // (e.g. on every reconnect via registerElectron) must replace, not append —
    // otherwise `implementations` accumulates duplicates.
    this.implementations = this.implementations.filter(
      (impl) => impl.interface !== name,
    );
    this.implementations.push({
      interface: name,
      definition: definition,
      dependencies: [],
    });
  }

  private getAvailableServices(): AvailableService[] {
    return Object.entries(this.context.connection?.serviceMap ?? {}).flatMap(([key, service]) => {
      if (!service || !service.alias) {
        return [];
      }

      return [{
        key,
        service: service.type ?? key,
        resolved: service.alias,
      }];
    });
  }

  notifyElectronListener(id: string, type: string, data: unknown) {
    const listener = this.electronListeners.get(id);
    if (listener) listener(type, data);
  }

  private createRequestController() {
    const controller = new AbortController();
    this.requestControllers.add(controller);
    return controller;
  }

  private releaseRequestController(controller: AbortController) {
    this.requestControllers.delete(controller);
  }

  private abortAllControllers() {
    this.cancelControllers.forEach((controller) => {
      controller.abort();
    });
    this.cancelControllers.clear();

    this.requestControllers.forEach((controller) => {
      controller.abort();
    });
    this.requestControllers.clear();
  }

  private async runAbortableRequest<T>(
    request: (controller: AbortController) => Promise<T>,
  ): Promise<T> {
    const controller = this.createRequestController();

    try {
      return await request(controller);
    } finally {
      this.releaseRequestController(controller);
    }
  }

  async registerElectron() {
    if (this.electronRegistered) return;
    try {
      if (window.api) {
        this.electronRegistered = true;
        await window.api.initAgent({
          token: this.token,
          url: this.context.connection!.endpoint.base_url,
          agentUrl: this.agentUrl,
          services: this.getAvailableServices(),
        });

        const impls = await window.api.inspectElectronAgent();
        impls.forEach(impl => {
          if (!impl.interface) return;
          this.register(impl.interface, async (context) => {
            this.electronListeners.set(context.message.task, (type, data) => {
              if (!data || typeof data !== "object") {
                return;
              }

              if (type === "yield" && "returns" in data) context.yield(data.returns as Record<string, unknown>);
              if (type === "done" && "returns" in data) context.return(data.returns as Record<string, unknown>);
              if (type === "error" && "error" in data) context.error(String(data.error));
            });
            try {
              console.log("Executing electron agent task:", context.message);
              await window.api.executeElectron(context.message);
            } catch (e) {
              context.error(String(e));
            } finally {
              this.electronListeners.delete(context.message.task);
            }
          }, impl.definition);
        });
      }
    } catch (e) {
      if (isAbortError(e)) {
        return;
      }
      console.error("Error registering electron agent:", e);
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearStableConnectionTimer() {
    if (this.stableConnectionTimer) {
      clearTimeout(this.stableConnectionTimer);
      this.stableConnectionTimer = null;
    }
  }

  private setConnectionFailure(reason: string, code?: number) {
    this.connected = false;
    this.lastCode = code;
    this.lastReason = reason;
    this.errors = [...this.errors, reason].slice(-MAX_AGENT_ERRORS);
    this.notify();
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setConnectionFailure(
        `Could not connect to the AGI endpoint after ${MAX_RECONNECT_ATTEMPTS} retries.`,
        this.lastCode,
      );
      return;
    }

    this.reconnectAttempts += 1;
    const retryNumber = this.reconnectAttempts;
    const existingReason = this.lastReason?.trim();
    const retryReason = existingReason
      ? `${existingReason} Retrying ${retryNumber}/${MAX_RECONNECT_ATTEMPTS}.`
      : `Retrying connection to the AGI endpoint (${retryNumber}/${MAX_RECONNECT_ATTEMPTS}).`;

    this.lastReason = retryReason;
    this.notify();

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  /**
   * Publish this agent and its implementations to the backend over GraphQL
   * BEFORE opening the websocket (mirrors rekuest_next: `ensure_agent` then
   * `implement_agent`). `ensureAgent` upserts the agent identity and returns the
   * server-side definition hash; when it differs from ours we (re)publish the
   * full implementation set with `implementAgent`.
   */
  public async announce() {
    if (!this.rekuestClient) throw new Error("Rekuest client not found");

    await this.registerElectron();

    const ensured = await this.runAbortableRequest((controller) =>
      this.rekuestClient.mutate<EnsureAgentMutation, EnsureAgentMutationVariables>({
        mutation: EnsureAgentDocument,
        variables: {
          input: {
            name: "Orkestrator",
          },
        },
        context: {
          fetchOptions: {
            signal: controller.signal,
          },
        },
      }),
    );

    const implementations = this.normalizedImplementations();

    console.log("Electron agent implementations:", implementations);
    const localHash = this.computeImplementationsHash(implementations);
    const serverHash = ensured.data?.ensureAgent?.hash;

    // Nothing registered → nothing to publish (still a valid caller/observer).
    if (implementations.length === 0 || serverHash === localHash) {
      return;
    }


    await this.runAbortableRequest((controller) =>
      this.rekuestClient.mutate<ImplementAgentMutation, ImplementAgentMutationVariables>({
        mutation: ImplementAgentDocument,
        variables: {
          input: {
            name: "Orkestrator",
            implementations,
            states: [],
            locks: [],
            bloks: [],
            hash: localHash,
          },
        },
        context: {
          fetchOptions: {
            signal: controller.signal,
          },
        },
      }),
    );
  }

  /**
   * Ensure every implementation's definition carries the fields the backend
   * requires (`key`, `name`, `version`). Definitions sourced from the Electron
   * agent (`inspectElectronAgent`) may omit them, which the `implementAgent`
   * mutation rejects — fall back to the interface name and a default version.
   */
  private normalizedImplementations(): ImplementationInput[] {
    return this.implementations.map((impl) => {
      const key = impl.interface ?? impl.definition.name;
      return {
        ...impl,
        definition: {
          ...impl.definition,
          key: impl.definition.key || key || "implementation",
          name: impl.definition.name || key || "Implementation",
          version: impl.definition.version || "0.1.0",
        },
      };
    });
  }

  /** Stable FNV-1a hash of the registered implementations (change detection). */
  private computeImplementationsHash(
    implementations: ImplementationInput[] = this.implementations,
  ): string {
    const serialized = JSON.stringify(implementations);
    let hash = 0x811c9dc5;
    for (let i = 0; i < serialized.length; i++) {
      hash ^= serialized.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16);
  }

  public connect() {

    console.log("Connecting agent...");

    this.clearReconnectTimer();
    this.clearStableConnectionTimer();

    // Use the freshest token for this (re)connect's REGISTER, in case the
    // context was refreshed in place while the socket was down.
    try {
      if (this.context.connection) {
        this.token = getAccessToken(this.context.connection.token);
      }
    } catch {
      // Keep the existing token.
    }

    this.announce();

    this.errors = [];
    this.lastCode = undefined;
    this.lastReason = undefined;
    this.notify();

    this.ws = new WebSocket(this.agentUrl);

    this.ws.onopen = () => {
      this.connected = true;
      this.clearStableConnectionTimer();
      this.stableConnectionTimer = setTimeout(() => {
        this.reconnectAttempts = 0;
        this.stableConnectionTimer = null;
      }, RETRY_RESET_MS);
      this.notify();

      this.send(
        Register.parse({
          type: "REGISTER",
          token: this.token,
          mode: AgentMode.enum.EXECUTOR,
          session_id: this.sessionId,
          // Don't displace another live Orkestrator connection (avoids two
          // windows kicking each other into a reconnect loop).
          force: false,
        })
      );
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        // Tolerate message types we don't handle (e.g. caller-bound *_EVENT
        // mirrors): ignore them rather than throwing on the whole stream.
        const parsed = ToAgentMessage.safeParse(data);
        if (!parsed.success) return;
        await this.handleMessage(parsed.data);
      } catch (e) {
        console.error("Error handling message", e);
      }
    };

    this.ws.onclose = (event) => {
      console.log("Agent connection closed", event);
      this.clearStableConnectionTimer();
      this.connected = false;
      this.lastCode = event.code;
      this.lastReason = event.reason;
      this.notify();

      if (this.shouldReconnect && !NO_RECONNECT_CODES.includes(event.code)) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (e) => {
      console.error("Agent error", e);
      this.clearStableConnectionTimer();
      this.errors = [...this.errors, "Websocket error"].slice(-MAX_AGENT_ERRORS);
      this.connected = false;
      this.notify();
    };
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.clearStableConnectionTimer();
    this.abortAllControllers();
    this.electronUnsubscribers.forEach((unsub) => unsub());
    this.electronUnsubscribers = [];
    this.ws?.close();
    this.connected = false;
    this.notify();
  }

  private send(message: FromAgentMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send an agent→backend report, stamping a monotonic `seq`. Terminal reports
   * (completed/failed/critical/cancelled/interrupted) are retained until the
   * backend EVENT_ACKs their id and resent on reconnect (persist-then-ack).
   */
  private report(message: FromAgentMessage, terminal: boolean) {
    const stamped = { ...message, seq: this.nextSeq++ } as FromAgentMessage;
    if (terminal && stamped.id) {
      this.unackedEvents.set(stamped.id, stamped);
    }
    this.send(stamped);
  }

  private async handleHeartbeat(_: ToAgentMessage) {
    this.send(
      FromAgentMessage.parse({
        type: "HEARTBEAT_ANSWER",
      })
    );
  }

  private async handleCancel(message: CancelMessage) {
    const controller = this.cancelControllers.get(message.task);
    if (controller) {
      controller.abort();
      this.cancelControllers.delete(message.task);
      this.report(CancelledEvent.parse({
        type: "CANCELLED",
        task: message.task,
      }), true);
      this.assignments = this.assignments.filter(a => a.task !== message.task);
      this.notify();
    }
    else {
      this.report(CriticalEvent.parse({
        type: "CRITICAL",
        task: message.task,
        error: `The task ${message.task} could not be cancelled because it was not found.`,
      }), true);
    }

  }

  /**
   * Backend acknowledgement of our Register. On a transient reconnect it carries
   * inquiries about tasks the backend still thinks we own: report those we still
   * run as in-progress, the rest as critically lost (a fresh process — new
   * session_id — owns none). Then resend any un-acked terminal reports.
   */
  private handleInit(message: Init) {
    for (const inquiry of message.inquiries) {
      if (this.cancelControllers.has(inquiry.task)) {
        this.report(ProgressEvent.parse({
          type: "PROGRESS",
          task: inquiry.task,
          progress: 0,
          message: "Actor is still running",
        }), false);
      } else {
        this.report(CriticalEvent.parse({
          type: "CRITICAL",
          task: inquiry.task,
          error: "After a disconnect this task was no longer managed by the agent.",
        }), true);
      }
    }

    for (const event of this.unackedEvents.values()) {
      this.send(event);
    }
  }

  private async handleMessage(message: ToAgentMessage) {
    switch (message.type) {
      case "INIT":
        this.handleInit(message);
        break;
      case "EVENT_ACK":
        this.unackedEvents.delete((message as EventAck).event);
        break;
      case "BOUNCE":
        // Soft restart: drop the socket and let the reconnect logic re-open it.
        this.ws?.close();
        break;
      case "KICK":
        this.shouldReconnect = false;
        this.ws?.close();
        break;
      case "PROTOCOL_ERROR":
        this.setConnectionFailure(`Protocol error: ${message.error}`);
        break;
      case "ASSIGN_RESPONSE":
        // Only relevant when acting as a caller over the socket; ignore.
        break;
      case "ASSIGN":
        await this.handleAssign(message);
        break;
      case "CANCEL":
        await this.handleCancel(message);
        break;
      case "HEARTBEAT":
        await this.handleHeartbeat(message);
        break;
    }
  }

  /** Forget a task once it reaches a terminal state (done/failed/cancelled). */
  private finishTask(task: string) {
    this.cancelControllers.delete(task);
    this.assignments = this.assignments.filter((a) => a.task !== task);
    this.notify();
  }

  private async handleAssign(message: Assign) {
    const { task, interface: interfaceName } = message;
    const handler = this.registry.get(interfaceName);

    if (!handler) {
      this.report(
        CriticalEvent.parse({
          type: "CRITICAL",
          task,
          error: `No handler for interface ${interfaceName}`,
        }),
        true,
      );
      return;
    }

    const newController = new AbortController();
    this.cancelControllers.set(task, newController);
    this.assignments.push(message);
    this.notify();

    this.report(StartedEvent.parse({ type: "STARTED", task }), false);

    // Serialize against the published definition: incoming structure args arrive
    // shrunk as `{ __identifier, object }` and must be expanded; the handler's
    // returns are shrunk back to wire form before being reported.
    const definition = this.definitions.get(interfaceName);
    const argPorts = (definition?.args ?? []) as SerPort[];
    const returnPorts = (definition?.returns ?? []) as SerPort[];
    const expandedArgs = expandArgs(message.args, argPorts);

    try {
      await handler({
        message,
        args: expandedArgs,
        send: (msg) => this.send(msg),
        app: this.context,
        yield: (returns) => {
          this.report(
            YieldEvent.parse({
              type: "YIELD",
              task,
              returns: shrinkReturns(returns, returnPorts),
            }),
            false,
          );
        },
        error: (error) => {
          this.report(
            FailedEvent.parse({ type: "FAILED", task, error }),
            true,
          );
          this.finishTask(task);
        },
        return: (returns) => {
          this.report(
            YieldEvent.parse({
              type: "YIELD",
              task,
              returns: shrinkReturns(returns, returnPorts),
            }),
            false,
          );
          this.report(CompletedEvent.parse({ type: "COMPLETED", task }), true);
          this.finishTask(task);
        },
        controller: newController,
        navigate: this.navigate,
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.report(
        CriticalEvent.parse({ type: "CRITICAL", task, error: errorMessage }),
        true,
      );
      this.finishTask(task);
    }
  }
}



