import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOICE_MODEL_ID,
  VOICE_MODELS,
  findVoiceModel,
  modelDownloadPlan,
  modelFileUrl,
  modelSupportsLanguage,
  recognizerConfigFor,
  vadFileUrl,
} from "./catalog";

describe("voice model catalog", () => {
  it("has a default that exists and unique ids", () => {
    expect(findVoiceModel(DEFAULT_VOICE_MODEL_ID)).toBeDefined();
    expect(new Set(VOICE_MODELS.map((model) => model.id)).size).toBe(VOICE_MODELS.length);
  });

  it("every model ships a tokens file", () => {
    for (const model of VOICE_MODELS) {
      expect(model.files.some((file) => file.endsWith("tokens.txt"))).toBe(true);
    }
  });

  it("filters models by language", () => {
    const moonshine = findVoiceModel("moonshine-base-en")!;
    const whisper = findVoiceModel("whisper-base")!;
    const parakeet = findVoiceModel("parakeet-tdt-0.6b-v3")!;
    expect(modelSupportsLanguage(moonshine, "de")).toBe(false);
    expect(modelSupportsLanguage(moonshine, "en")).toBe(true);
    expect(modelSupportsLanguage(moonshine, "auto")).toBe(true);
    expect(modelSupportsLanguage(whisper, "ja")).toBe(true);
    expect(modelSupportsLanguage(parakeet, "de")).toBe(true);
    expect(modelSupportsLanguage(parakeet, "ja")).toBe(false);
  });

  it("resolves files on Hugging Face by default and on a mirror when given", () => {
    const whisper = findVoiceModel("whisper-base")!;
    expect(modelFileUrl(whisper, "base-tokens.txt")).toBe(
      "https://huggingface.co/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-tokens.txt",
    );
    expect(modelFileUrl(whisper, "base-tokens.txt", "https://mirror.lab/")).toBe(
      "https://mirror.lab/csukuangfj/sherpa-onnx-whisper-base/resolve/main/base-tokens.txt",
    );
    expect(vadFileUrl()).toContain("github.com/k2-fsa/sherpa-onnx");
    expect(vadFileUrl("https://mirror.lab")).toBe("https://mirror.lab/vad/silero_vad.onnx");
    expect(modelDownloadPlan(whisper).files.map((file) => file.name)).toEqual(whisper.files);
  });

  it("builds a recognizer config in the shape sherpa-onnx-node expects", () => {
    const whisper = recognizerConfigFor(findVoiceModel("whisper-base")!, "/models/whisper-base", "de", 3) as {
      modelConfig: { whisper: { encoder: string; language: string }; tokens: string; numThreads: number };
    };
    expect(whisper.modelConfig.whisper.encoder).toBe("/models/whisper-base/base-encoder.int8.onnx");
    expect(whisper.modelConfig.whisper.language).toBe("de");
    expect(whisper.modelConfig.tokens).toBe("/models/whisper-base/base-tokens.txt");
    expect(whisper.modelConfig.numThreads).toBe(3);

    const auto = recognizerConfigFor(findVoiceModel("whisper-base")!, "/m", "auto", 1) as {
      modelConfig: { whisper: { language: string } };
    };
    expect(auto.modelConfig.whisper.language).toBe("");

    const moonshine = recognizerConfigFor(findVoiceModel("moonshine-base-en")!, "/m", "en", 1) as {
      modelConfig: { moonshine: { preprocessor: string; cachedDecoder: string } };
    };
    expect(moonshine.modelConfig.moonshine.preprocessor).toBe("/m/preprocess.onnx");
    expect(moonshine.modelConfig.moonshine.cachedDecoder).toBe("/m/cached_decode.int8.onnx");

    const parakeet = recognizerConfigFor(findVoiceModel("parakeet-tdt-0.6b-v3")!, "/m", "auto", 1) as {
      modelConfig: { transducer: { joiner: string }; modelType: string };
    };
    expect(parakeet.modelConfig.transducer.joiner).toBe("/m/joiner.int8.onnx");
    expect(parakeet.modelConfig.modelType).toBe("nemo_transducer");
  });
});
