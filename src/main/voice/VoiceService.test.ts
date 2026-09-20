import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelStore } from "./ModelStore";
import { VoiceService, type VoiceServiceDeps } from "./VoiceService";
import type { VoiceEvent, WorkerInbound } from "./protocol";

/**
 * The service against a fake utility process, a fake channel and a model
 * store that pretends everything is on disk — the wiring, not sherpa.
 */

class FakeChild extends EventEmitter {
  sent: { message: WorkerInbound; transfer?: unknown[] }[] = [];
  killed = false;
  /** Answer "start" with "ready" like the real worker; off for the failure test. */
  autoReady = true;
  postMessage(message: WorkerInbound, transfer?: unknown[]) {
    this.sent.push({ message, transfer });
    if (message.type === "start" && this.autoReady) queueMicrotask(() => this.emit("message", { type: "ready" }));
    if (message.type === "stop") queueMicrotask(() => this.emit("exit", 0));
  }
  kill() {
    this.killed = true;
    this.emit("exit", 0);
    return true;
  }
}

const fakePort = () => ({ close: vi.fn(), start: vi.fn(), postMessage: vi.fn(), on: vi.fn() });

const setup = ({ autoReady = true }: { autoReady?: boolean } = {}) => {
  const children: FakeChild[] = [];
  const events: VoiceEvent[] = [];
  const modelStore = new ModelStore("/nowhere");
  vi.spyOn(modelStore, "isComplete").mockResolvedValue(true);
  vi.spyOn(modelStore, "ensure").mockImplementation(async (plan) => `/models/${plan.id}`);

  const deps: VoiceServiceDeps = {
    fork: () => {
      const child = new FakeChild();
      child.autoReady = autoReady;
      children.push(child);
      return child as unknown as Electron.UtilityProcess;
    },
    createChannel: () => ({ port1: fakePort(), port2: fakePort() }) as unknown as ReturnType<VoiceServiceDeps["createChannel"]>,
    workerPath: "/out/voice-worker.js",
    modelStore,
  };
  const webContents = { isDestroyed: () => false, send: vi.fn((_c: string, event: VoiceEvent) => events.push(event)) };
  const windowManager = { getAllWindows: () => [{ isDestroyed: () => false, webContents }] };
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  const transport = {
    handleChannel: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => handlers.set(channel, listener),
    sendTo: (wc: typeof webContents, channel: string, event: VoiceEvent) => wc.send(channel, event),
  };

  const service = new VoiceService(
    transport as never,
    windowManager as never,
    deps,
  );
  service.setup();
  return { service, children, events, handlers, modelStore };
};

const config = { modelId: "whisper-base", language: "auto", threads: 2 };

describe("VoiceService", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("starts: ensures models, forks once, sends the recognizer config and reports ready", async () => {
    const { service, children, events, modelStore } = setup();
    const status = await service.start(config);

    expect(status.status).toBe("ready");
    expect(children).toHaveLength(1);
    expect(modelStore.ensure).toHaveBeenCalledTimes(2);
    const start = children[0].sent[0].message;
    expect(start.type).toBe("start");
    if (start.type === "start") {
      expect(start.vadModelPath).toBe("/models/silero-vad/silero_vad.onnx");
      expect(start.threads).toBe(2);
    }
    expect(events.map((event) => event.type === "status" && event.status)).toEqual(["starting", "starting", "ready"]);
  });

  it("marks downloading while a model is missing", async () => {
    const { service, events, modelStore } = setup();
    vi.mocked(modelStore.isComplete).mockResolvedValue(false);
    await service.start(config);
    expect(events.some((event) => event.type === "status" && event.status === "downloading")).toBe(true);
  });

  it("does not reload for a second window asking for the same config", async () => {
    const { service, children } = setup();
    await service.start(config);
    await service.start({ ...config });
    expect(children).toHaveLength(1);
    expect(children[0].sent.filter((entry) => entry.message.type === "start")).toHaveLength(1);
  });

  it("reloads the model in the same process when the config changes", async () => {
    const { service, children } = setup();
    await service.start(config);
    await service.start({ ...config, language: "de" });
    expect(children).toHaveLength(1);
    expect(children[0].sent.filter((entry) => entry.message.type === "start")).toHaveLength(2);
  });

  it("refuses ports until ready, then attaches a session with two ports each way", async () => {
    const { service, children, handlers } = setup();
    const sender = { id: 7, isDestroyed: () => false, postMessage: vi.fn() };
    await expect(handlers.get("voice:request-ports")!({ sender })).rejects.toThrow(/not ready/);

    await service.start(config);
    const { sessionId } = (await handlers.get("voice:request-ports")!({ sender })) as { sessionId: string };
    expect(sessionId).toMatch(/[0-9a-f-]{36}/);
    const attach = children[0].sent.find((entry) => entry.message.type === "attach");
    expect(attach?.transfer).toHaveLength(2);
    expect(sender.postMessage).toHaveBeenCalledWith("voice:ports", { sessionId }, expect.any(Array));
    expect(sender.postMessage.mock.calls[0][2]).toHaveLength(2);
  });

  it("refuses ports when the microphone is denied", async () => {
    const { service, handlers } = setup();
    (service as unknown as { deps: VoiceServiceDeps }).deps.askForMicrophone = async () => false;
    await service.start(config);
    await expect(
      handlers.get("voice:request-ports")!({ sender: { id: 1, isDestroyed: () => false, postMessage: vi.fn() } }),
    ).rejects.toThrow(/denied/);
  });

  it("reports an unexpected exit as an error, and a requested stop as off", async () => {
    const { service, children, events } = setup();
    await service.start(config);
    children[0].emit("exit", 9);
    expect(events.at(-1)).toMatchObject({ type: "status", status: "error" });

    const { service: second, children: more, events: later } = setup();
    await second.start(config);
    await second.stop();
    expect(more[0].sent.at(-1)?.message.type).toBe("stop");
    expect(later.at(-1)).toMatchObject({ type: "status", status: "off" });
  });

  it("surfaces a worker that fails to load the model", async () => {
    const { service, children } = setup({ autoReady: false });
    const promise = service.start(config);
    await vi.waitFor(() => expect(children[0]?.sent.some((entry) => entry.message.type === "start")).toBe(true));
    children[0].emit("message", { type: "error", message: "bad model" });
    const status = await promise;
    expect(status.status).toBe("error");
    expect(status.error).toMatch(/bad model/);
  });
});
