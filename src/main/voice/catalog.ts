import { join } from "node:path";
import type { RecognizerConfig, VoiceModelKind } from "./protocol";

/**
 * The speech models the app knows how to fetch and run. Nothing here is
 * bundled: a model is downloaded into `userData/voice-models/<id>/` the first
 * time it is chosen (see `ModelStore`), file by file, so a lab that mirrors
 * Hugging Face can point `voiceModelHost` at the mirror and the same paths
 * resolve there.
 *
 * Every entry is one of sherpa-onnx's own conversions, published under
 * `csukuangfj/sherpa-onnx-*` on Hugging Face and as tarballs on the sherpa-onnx
 * GitHub releases; the file names below are those repos' exact file names.
 *
 * `languages` is what the settings page filters on: `"multi"` (Whisper: any of
 * its 99 languages, or auto-detect) or the explicit list a model was trained on.
 */
export type VoiceModelSpec = {
  id: string;
  label: string;
  kind: VoiceModelKind;
  languages: "multi" | readonly string[];
  /** Approximate download size, for the picker. */
  sizeMB: number;
  /** Hugging Face repo path; files resolve at `<host>/<repo>/resolve/main/<file>`. */
  repo: string;
  files: readonly string[];
  /** Short note for the picker — what it is good at, what it costs. */
  note: string;
};

export const DEFAULT_MODEL_HOST = "https://huggingface.co";

/**
 * Silero VAD: what cuts the microphone stream into utterances. Always
 * fetched alongside whatever model is chosen. It lives on the sherpa-onnx
 * releases rather than in a model repo, so on a mirror it is expected at
 * `<host>/vad/silero_vad.onnx`.
 */
export const VAD_MODEL = {
  id: "silero-vad",
  file: "silero_vad.onnx",
  url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx",
  sizeMB: 2,
} as const;

/** The 25 languages NVIDIA lists for Parakeet TDT 0.6B v3. */
export const PARAKEET_V3_LANGUAGES = [
  "bg", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "hu", "it",
  "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv", "ru", "uk",
] as const;

const whisper = (size: "tiny" | "base" | "small" | "turbo", sizeMB: number, note: string, extra: string[] = []): VoiceModelSpec => ({
  id: `whisper-${size}`,
  label: `Whisper ${size}`,
  kind: "whisper",
  languages: "multi",
  sizeMB,
  repo: `csukuangfj/sherpa-onnx-whisper-${size}`,
  files: [`${size}-encoder.int8.onnx`, `${size}-decoder.int8.onnx`, `${size}-tokens.txt`, ...extra],
  note,
});

export const VOICE_MODELS: readonly VoiceModelSpec[] = [
  {
    id: "moonshine-tiny-en",
    label: "Moonshine tiny (English)",
    kind: "moonshine",
    languages: ["en"],
    sizeMB: 30,
    repo: "csukuangfj/sherpa-onnx-moonshine-tiny-en-int8",
    files: ["preprocess.onnx", "encode.int8.onnx", "uncached_decode.int8.onnx", "cached_decode.int8.onnx", "tokens.txt"],
    note: "Fastest. English only.",
  },
  {
    id: "moonshine-base-en",
    label: "Moonshine base (English)",
    kind: "moonshine",
    languages: ["en"],
    sizeMB: 60,
    repo: "csukuangfj/sherpa-onnx-moonshine-base-en-int8",
    files: ["preprocess.onnx", "encode.int8.onnx", "uncached_decode.int8.onnx", "cached_decode.int8.onnx", "tokens.txt"],
    note: "Fast and accurate. English only.",
  },
  whisper("tiny", 40, "Very fast, rough. Any language."),
  whisper("base", 75, "Good default. Any language."),
  whisper("small", 250, "More accurate, slower. Any language."),
  whisper("turbo", 800, "Best accuracy, needs a fast machine. Any language.", ["turbo-encoder.weights"]),
  {
    id: "parakeet-tdt-0.6b-v3",
    label: "Parakeet TDT 0.6B v3",
    kind: "nemo_transducer",
    languages: PARAKEET_V3_LANGUAGES,
    sizeMB: 640,
    repo: "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
    files: ["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"],
    note: "Very accurate for 25 European languages; detects the language itself.",
  },
];

export const DEFAULT_VOICE_MODEL_ID = "whisper-base";

export const findVoiceModel = (id: string): VoiceModelSpec | undefined =>
  VOICE_MODELS.find((model) => model.id === id);

/** Whether `language` ("auto" or ISO-639-1) can be transcribed by `model`. */
export const modelSupportsLanguage = (model: VoiceModelSpec, language: string): boolean =>
  model.languages === "multi" || language === "auto" || model.languages.includes(language);

const hostBase = (host: string | undefined): string =>
  (host && host.trim() ? host.trim() : DEFAULT_MODEL_HOST).replace(/\/+$/, "");

export const modelFileUrl = (model: VoiceModelSpec, file: string, host?: string): string =>
  `${hostBase(host)}/${model.repo}/resolve/main/${file}`;

export const vadFileUrl = (host?: string): string =>
  host && host.trim() ? `${hostBase(host)}/vad/${VAD_MODEL.file}` : VAD_MODEL.url;

export type DownloadPlan = {
  id: string;
  files: { name: string; url: string }[];
};

export const modelDownloadPlan = (model: VoiceModelSpec, host?: string): DownloadPlan => ({
  id: model.id,
  files: model.files.map((name) => ({ name, url: modelFileUrl(model, name, host) })),
});

export const vadDownloadPlan = (host?: string): DownloadPlan => ({
  id: VAD_MODEL.id,
  files: [{ name: VAD_MODEL.file, url: vadFileUrl(host) }],
});

/**
 * The sherpa-onnx `OfflineRecognizer` config for a downloaded model. The shapes
 * follow sherpa-onnx-node's own examples (`non-streaming-asr.js`); the key
 * names are the addon's, not ours.
 */
export const recognizerConfigFor = (
  model: VoiceModelSpec,
  dir: string,
  language: string,
  threads: number,
): RecognizerConfig => {
  const file = (name: string) => join(dir, name);
  const common = { numThreads: threads, provider: "cpu", debug: 0 };
  const tokens = file(model.files.find((name) => name.endsWith("tokens.txt")) ?? "tokens.txt");

  switch (model.kind) {
    case "whisper": {
      const [encoder, decoder] = model.files;
      return {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          whisper: {
            encoder: file(encoder),
            decoder: file(decoder),
            // "" lets Whisper detect the language from the audio.
            language: language === "auto" ? "" : language,
            task: "transcribe",
            tailPaddings: -1,
          },
          tokens,
          ...common,
        },
        decodingMethod: "greedy_search",
        maxActivePaths: 4,
      };
    }
    case "moonshine": {
      const [preprocessor, encoder, uncachedDecoder, cachedDecoder] = model.files;
      return {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          moonshine: {
            preprocessor: file(preprocessor),
            encoder: file(encoder),
            uncachedDecoder: file(uncachedDecoder),
            cachedDecoder: file(cachedDecoder),
          },
          tokens,
          ...common,
        },
        decodingMethod: "greedy_search",
      };
    }
    case "nemo_transducer": {
      const [encoder, decoder, joiner] = model.files;
      return {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          transducer: { encoder: file(encoder), decoder: file(decoder), joiner: file(joiner) },
          tokens,
          modelType: "nemo_transducer",
          ...common,
        },
        decodingMethod: "greedy_search",
      };
    }
  }
};
