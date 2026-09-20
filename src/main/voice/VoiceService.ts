import { randomUUID } from "node:crypto";
import type { AppModule } from "../modules/AppModule";
import type { IpcTransport } from "../modules/IpcTransport";
import type { WindowManager } from "../modules/WindowManager";
import {
  VAD_MODEL,
  VOICE_MODELS,
  findVoiceModel,
  modelDownloadPlan,
  recognizerConfigFor,
  vadDownloadPlan,
} from "./catalog";
import { ModelStore } from "./ModelStore";
import {
  VOICE_EVENT_CHANNEL,
  VOICE_PORTS_CHANNEL,
  type VoiceEvent,
  type VoiceModelState,
  type VoicePortsPayload,
  type VoiceStartConfig,
  type VoiceStatusPayload,
  type WorkerInbound,
  type WorkerOutbound,
} from "./protocol";

/**
 * The main-process half of voice input: owns the utility process that runs the
 * speech model, the on-disk model store, and the pairing of a window with a
 * session in that process.
 *
 * Everything Electron-specific is injected (`VoiceServiceDeps`) so the class
 * can be exercised under vitest with a fake process and channel; `index.ts`
 * wires the real `utilityProcess.fork` / `MessageChannelMain`.
 *
 * Lifecycle: nothing runs until a renderer calls `voice:start` (which the
 * renderer only does once the user has switched voice input on). `voice:stop`
 * — or the last window going away, or quit — ends the process. Status changes
 * are broadcast to every window, so a popout's settings card and the main
 * window's rail agree.
 */

export type VoiceServiceDeps = {
  fork: (modulePath: string) => Electron.UtilityProcess;
  createChannel: () => { port1: Electron.MessagePortMain; port2: Electron.MessagePortMain };
  workerPath: string;
  modelStore: ModelStore;
  /** macOS: trigger the system microphone prompt. Elsewhere resolves true. */
  askForMicrophone?: () => Promise<boolean>;
};

type PortSender = {
  id: number;
  isDestroyed(): boolean;
  postMessage(channel: string, message: unknown, transfer?: Electron.MessagePortMain[]): void;
};

const READY_TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 2_000;

export class VoiceService implements AppModule {
  private child: Electron.UtilityProcess | undefined;
  private status: VoiceStatusPayload = { status: "off" };
  private config: VoiceStartConfig | undefined;
  private starting: AbortController | undefined;
  private readonly sessions = new Map<string, { senderId: number }>();

  constructor(
    private readonly transport: IpcTransport,
    private readonly windowManager: WindowManager,
    private readonly deps: VoiceServiceDeps,
  ) {}

  setup() {
    this.transport.handleChannel("voice:start", (_event, config: VoiceStartConfig) => this.start(config));
    this.transport.handleChannel("voice:stop", () => this.stop());
    this.transport.handleChannel("voice:status", () => this.status);
    this.transport.handleChannel("voice:catalog", () =>
      VOICE_MODELS.map(({ id, label, kind, languages, sizeMB, note }) => ({ id, label, kind, languages, sizeMB, note })),
    );
    this.transport.handleChannel("voice:models:list", () => this.listModels());
    this.transport.handleChannel("voice:models:ensure", (_event, args: { modelId: string; modelHost?: string }) =>
      this.ensureModel(args.modelId, args.modelHost),
    );
    this.transport.handleChannel("voice:models:remove", (_event, args: { modelId: string }) => this.removeModel(args.modelId));
    this.transport.handleChannel("voice:models:cancel", (_event, args: { modelId: string }) => {
      this.deps.modelStore.cancel(args.modelId);
    });
    this.transport.handleChannel("voice:request-ports", (event) => this.requestPorts(event.sender as PortSender));
  }

  onBeforeQuit() {
    this.killChild();
  }

  onWindowAllClosed() {
    // Nobody left to dictate; free the model's memory.
    void this.stop();
  }

  // ── engine ──

  async start(config: VoiceStartConfig): Promise<VoiceStatusPayload> {
    const model = findVoiceModel(config.modelId);
    if (!model) {
      this.setStatus({ status: "error", error: `Unknown speech model "${config.modelId}"` });
      return this.status;
    }

    // A second window starting the same engine (every window's runtime calls
    // start on mount) must not reload the model under the first one's session.
    if (
      !this.starting &&
      this.child &&
      this.status.status === "ready" &&
      this.config &&
      sameConfig(this.config, config)
    ) {
      return this.status;
    }

    // A newer start supersedes one still downloading or loading.
    this.starting?.abort();
    const controller = new AbortController();
    this.starting = controller;
    this.config = config;

    try {
      this.setStatus({ status: "starting", modelId: model.id, language: config.language });

      const [vadDir, modelDir] = await Promise.all([
        this.ensure(vadDownloadPlan(config.modelHost), controller.signal),
        this.ensure(modelDownloadPlan(model, config.modelHost), controller.signal),
      ]);
      if (controller.signal.aborted) return this.status;

      this.setStatus({ status: "starting", modelId: model.id, language: config.language });
      const child = this.spawn();
      const ready = this.awaitReady(child, controller.signal);
      const message: WorkerInbound = {
        type: "start",
        recognizer: recognizerConfigFor(model, modelDir, config.language, config.threads),
        vadModelPath: `${vadDir}/${VAD_MODEL.file}`,
        threads: config.threads,
      };
      child.postMessage(message);
      await ready;
      if (controller.signal.aborted) return this.status;

      this.setStatus({ status: "ready", modelId: model.id, language: config.language });
    } catch (error) {
      if (!controller.signal.aborted) {
        this.setStatus({ status: "error", modelId: model.id, error: errorMessage(error) });
      }
    } finally {
      if (this.starting === controller) this.starting = undefined;
    }
    return this.status;
  }

  async stop(): Promise<VoiceStatusPayload> {
    this.starting?.abort();
    this.starting = undefined;
    this.config = undefined;
    this.killChild();
    this.setStatus({ status: "off" });
    return this.status;
  }

  private spawn(): Electron.UtilityProcess {
    if (this.child) return this.child;
    const child = this.deps.fork(this.deps.workerPath);
    this.child = child;
    child.on("message", (message: WorkerOutbound) => this.onWorkerMessage(message));
    child.on("exit", (code) => {
      if (this.child !== child) return;
      this.child = undefined;
      this.sessions.clear();
      if (this.status.status !== "off") {
        this.setStatus({
          status: "error",
          modelId: this.status.modelId,
          error: `The voice engine stopped unexpectedly (exit code ${code})`,
        });
      }
    });
    return child;
  }

  private awaitReady(child: Electron.UtilityProcess, signal: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("The voice engine did not start in time")), READY_TIMEOUT_MS);
      const onMessage = (message: WorkerOutbound) => {
        if (message.type === "ready") finish();
        else if (message.type === "error") finish(new Error(message.message));
      };
      const onExit = (code: number) => finish(new Error(`The voice engine exited (code ${code})`));
      const onAbort = () => finish();
      const finish = (error?: Error) => {
        clearTimeout(timer);
        child.off("message", onMessage);
        child.off("exit", onExit);
        signal.removeEventListener("abort", onAbort);
        error ? reject(error) : resolve();
      };
      child.on("message", onMessage);
      child.on("exit", onExit);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private onWorkerMessage(message: WorkerOutbound) {
    if (message.type === "log") {
      this.broadcast({ type: "log", message: message.message });
    } else if (message.type === "session-closed") {
      this.sessions.delete(message.sessionId);
    } else if (message.type === "error" && this.status.status === "ready") {
      this.setStatus({ ...this.status, status: "error", error: message.message });
    }
  }

  private killChild() {
    const child = this.child;
    if (!child) return;
    this.child = undefined;
    this.sessions.clear();
    try {
      child.postMessage({ type: "stop" } satisfies WorkerInbound);
    } catch {
      // Already gone.
    }
    // `stop` makes the worker exit on its own; the kill is for a hung one.
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // Already gone.
      }
    }, KILL_GRACE_MS);
    child.once("exit", () => clearTimeout(timer));
  }

  // ── sessions ──

  private async requestPorts(sender: PortSender): Promise<VoicePortsPayload> {
    if (!this.child || this.status.status !== "ready") {
      throw new Error("Voice engine is not ready");
    }
    if (this.deps.askForMicrophone && !(await this.deps.askForMicrophone())) {
      throw new Error("Microphone access was denied");
    }
    const sessionId = randomUUID();
    const audio = this.deps.createChannel();
    const control = this.deps.createChannel();
    this.sessions.set(sessionId, { senderId: sender.id });
    this.child.postMessage({ type: "attach", sessionId } satisfies WorkerInbound, [audio.port2, control.port2]);
    if (!sender.isDestroyed()) {
      sender.postMessage(VOICE_PORTS_CHANNEL, { sessionId } satisfies VoicePortsPayload, [audio.port1, control.port1]);
    }
    return { sessionId };
  }

  // ── models ──

  private async ensure(plan: ReturnType<typeof modelDownloadPlan>, signal: AbortSignal): Promise<string> {
    const complete = await this.deps.modelStore.isComplete(plan);
    if (!complete) this.setStatus({ ...this.status, status: "downloading", modelId: this.status.modelId });
    return this.deps.modelStore.ensure(plan, {
      signal,
      onProgress: (progress) => this.broadcast({ type: "model-progress", progress }),
    });
  }

  private async ensureModel(modelId: string, modelHost?: string): Promise<VoiceModelState[]> {
    const model = findVoiceModel(modelId);
    if (!model) throw new Error(`Unknown speech model "${modelId}"`);
    try {
      await Promise.all([
        this.deps.modelStore.ensure(vadDownloadPlan(modelHost), {
          onProgress: (progress) => this.broadcast({ type: "model-progress", progress }),
        }),
        this.deps.modelStore.ensure(modelDownloadPlan(model, modelHost), {
          onProgress: (progress) => this.broadcast({ type: "model-progress", progress }),
        }),
      ]);
      this.broadcast({ type: "model-done", modelId });
    } catch (error) {
      this.broadcast({ type: "model-error", modelId, error: errorMessage(error) });
      throw error;
    }
    return this.listModels();
  }

  private async removeModel(modelId: string): Promise<VoiceModelState[]> {
    if (this.status.status !== "off" && this.config?.modelId === modelId) {
      await this.stop();
    }
    await this.deps.modelStore.remove(modelId);
    return this.listModels();
  }

  private listModels(): Promise<VoiceModelState[]> {
    return this.deps.modelStore.list(VOICE_MODELS.map((model) => model.id));
  }

  // ── status ──

  private setStatus(next: VoiceStatusPayload) {
    this.status = next;
    this.broadcast({ type: "status", ...next });
  }

  private broadcast(event: VoiceEvent) {
    for (const win of this.windowManager.getAllWindows()) {
      if (win.isDestroyed()) continue;
      this.transport.sendTo(win.webContents, VOICE_EVENT_CHANNEL, event);
    }
  }
}

const sameConfig = (a: VoiceStartConfig, b: VoiceStartConfig): boolean =>
  a.modelId === b.modelId &&
  a.language === b.language &&
  a.threads === b.threads &&
  (a.modelHost ?? "") === (b.modelHost ?? "");

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
