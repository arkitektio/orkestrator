import { SwitchField } from "@/components/fields/SwitchField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormDescription, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Settings } from "@/providers/settings/validator";
import { Check, Download, Mic, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type {
  VoiceCatalogEntry,
  VoiceModelProgress,
  VoiceModelState,
} from "../../../../main/voice/protocol";
import { describeHotkey } from "../hotkey";
import { isVoiceAvailable } from "../store";
import { overallPercent } from "../VoiceIsland";
import { AUTO_LANGUAGE, VOICE_LANGUAGES, languageFitsModel } from "./languages";

/**
 * Settings → Voice input. Lives inside the settings page's auto-saving form:
 * every control here writes a `voice*` key through `useController`, and the
 * page's `useWatch` effect persists it. Nothing is applied until the master
 * switch is on, and switching it on downloads nothing by itself — the model is
 * fetched when the engine starts (with a row in the rail), or from the
 * Download button here.
 */

const formatMB = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`;

const useVoiceCatalog = () => {
  const [catalog, setCatalog] = useState<VoiceCatalogEntry[]>([]);
  useEffect(() => {
    if (!isVoiceAvailable()) return;
    window.api.voice
      .catalog()
      .then(setCatalog)
      .catch((error) => console.error("voice catalog", error));
  }, []);
  return catalog;
};

/** Which models are on disk, kept current through the engine's events. */
const useVoiceModelStates = () => {
  const [states, setStates] = useState<Record<string, VoiceModelState>>({});
  const [progress, setProgress] = useState<Record<string, VoiceModelProgress>>({});

  const refresh = useCallback(() => {
    if (!isVoiceAvailable()) return;
    window.api.voice.models
      .list()
      .then((list) => setStates(Object.fromEntries(list.map((state) => [state.id, state]))))
      .catch((error) => console.error("voice models", error));
  }, []);

  useEffect(() => {
    refresh();
    if (!isVoiceAvailable()) return;
    return window.api.voice.onEvent((event) => {
      if (event.type === "model-progress") {
        setProgress((current) => ({ ...current, [event.progress.modelId]: event.progress }));
      } else if (event.type === "model-done" || event.type === "model-error") {
        setProgress((current) => {
          const next = { ...current };
          delete next[event.modelId];
          return next;
        });
        refresh();
      } else if (event.type === "status" && (event.status === "ready" || event.status === "error")) {
        setProgress({});
        refresh();
      }
    });
  }, [refresh]);

  return { states, progress, refresh };
};

const HotkeyRecorder = () => {
  const { field } = useController<Settings, "voiceHotkey">({ name: "voiceHotkey" });
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      // Modifiers alone are not a hotkey.
      if (/^(Control|Meta|Alt|Shift)/.test(event.code)) return;
      field.onChange(event.code);
      setRecording(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, field]);

  return (
    <FormItem>
      <FormLabel>Hotkey</FormLabel>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setRecording(true)}>
          {recording ? "Press a key…" : describeHotkey(field.value)}
        </Button>
        {field.value !== "KeyL" && (
          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange("KeyL")}>
            Reset
          </Button>
        )}
      </div>
      <FormDescription>
        Pressed with ⌘ (or Ctrl). Hold it while you talk; releasing it transcribes. Tap it
        twice for hands-free listening, and once more (or pause) to stop. In a text field the
        words go into that field; anywhere else the search bar opens and takes them.
      </FormDescription>
    </FormItem>
  );
};

const InputDeviceSelect = () => {
  const { field } = useController<Settings, "voiceInputDeviceId">({ name: "voiceInputDeviceId" });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    const load = () =>
      navigator.mediaDevices
        .enumerateDevices()
        .then((all) => setDevices(all.filter((device) => device.kind === "audioinput")))
        .catch(() => setDevices([]));
    load();
    navigator.mediaDevices.addEventListener("devicechange", load);
    return () => navigator.mediaDevices.removeEventListener("devicechange", load);
  }, []);

  return (
    <FormItem>
      <FormLabel>Microphone</FormLabel>
      <Select
        value={field.value ?? "default"}
        onValueChange={(value) => field.onChange(value === "default" ? null : value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">System default</SelectItem>
          {devices
            .filter((device) => device.deviceId && device.deviceId !== "default")
            .map((device, index) => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <FormDescription>
        Device names appear after the microphone has been used once.
      </FormDescription>
    </FormItem>
  );
};

const ModelPicker = ({ catalog }: { catalog: VoiceCatalogEntry[] }) => {
  const language = useWatch<Settings, "voiceLanguage">({ name: "voiceLanguage" });
  const modelHost = useWatch<Settings, "voiceModelHost">({ name: "voiceModelHost" });
  const { field } = useController<Settings, "voiceModel">({ name: "voiceModel" });
  const { states, progress } = useVoiceModelStates();
  const [busy, setBusy] = useState<string | null>(null);

  const current = catalog.find((model) => model.id === field.value);
  const fits = current ? languageFitsModel(current, language) : true;
  const state = states[field.value];
  const downloading = progress[field.value];
  const percent = overallPercent(downloading);

  const download = async () => {
    setBusy(field.value);
    try {
      await window.api.voice.models.ensure({ modelId: field.value, modelHost: modelHost || undefined });
      toast.success(`${current?.label ?? field.value} is ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy(field.value);
    try {
      await window.api.voice.models.remove({ modelId: field.value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <FormItem>
      <FormLabel>Speech model</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {catalog.map((model) => {
            const onDisk = states[model.id]?.downloaded;
            const supported = languageFitsModel(model, language);
            return (
              <SelectItem key={model.id} value={model.id} disabled={!supported}>
                <span className="flex items-center gap-2">
                  {model.label}
                  <span className="text-xs text-muted-foreground">
                    {model.sizeMB} MB{onDisk ? " · downloaded" : ""}
                    {!supported ? " · not for this language" : ""}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {current && (
        <FormDescription>
          {current.note}
          {!fits && (
            <span className="ml-1 text-destructive">
              This model does not transcribe the selected language.
            </span>
          )}
        </FormDescription>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {state?.downloaded ? (
          <>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" /> On this computer ({formatMB(state.bytes)})
            </span>
            <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void remove()}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          </>
        ) : downloading || busy === field.value ? (
          <>
            <span className="text-xs tabular-nums text-muted-foreground">
              Downloading{percent !== undefined ? ` ${Math.round(percent)}%` : "…"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void window.api.voice.models.cancel({ modelId: field.value })}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Cancel
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => void download()}>
            <Download className="mr-1 h-3.5 w-3.5" /> Download now
          </Button>
        )}
      </div>
    </FormItem>
  );
};

const LanguageSelect = () => {
  const { field } = useController<Settings, "voiceLanguage">({ name: "voiceLanguage" });
  return (
    <FormItem>
      <FormLabel>Language</FormLabel>
      <Select value={field.value || AUTO_LANGUAGE} onValueChange={field.onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VOICE_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        What you will be speaking. "Detect automatically" lets a multilingual model decide per phrase.
      </FormDescription>
    </FormItem>
  );
};

const NumberSetting = ({
  name,
  label,
  description,
  min,
  max,
}: {
  name: "voiceAutoStop" | "voiceThreads";
  label: string;
  description: string;
  min: number;
  max: number;
}) => {
  const { field } = useController<Settings, typeof name>({ name });
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Input
        type="number"
        min={min}
        max={max}
        step={1}
        value={field.value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(next)) field.onChange(Math.min(max, Math.max(min, next)));
        }}
        className="w-28 text-foreground"
      />
      <FormDescription>{description}</FormDescription>
    </FormItem>
  );
};

const ModelHostSetting = () => {
  const { field } = useController<Settings, "voiceModelHost">({ name: "voiceModelHost" });
  return (
    <FormItem>
      <FormLabel>Model mirror (optional)</FormLabel>
      <Input
        placeholder="https://huggingface.co"
        value={field.value ?? ""}
        onChange={(event) => field.onChange(event.target.value || undefined)}
        className="text-foreground"
      />
      <FormDescription>
        For labs without internet access: a server mirroring{" "}
        <code>csukuangfj/sherpa-onnx-*/resolve/main/&lt;file&gt;</code> and{" "}
        <code>vad/silero_vad.onnx</code>. Leave empty to fetch from Hugging Face.
      </FormDescription>
    </FormItem>
  );
};

export const VoiceSettingsCard = () => {
  const form = useFormContext<Settings>();
  const enabled = useWatch({ control: form.control, name: "voiceControl" });
  const catalog = useVoiceCatalog();
  const available = isVoiceAvailable();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice input
        </CardTitle>
        <CardDescription>
          Dictate into the search bar or any text field. Speech is recognised on this computer;
          nothing leaves it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!available ? (
          <p className="text-sm text-muted-foreground">
            Voice input needs the desktop app.
          </p>
        ) : (
          <>
            <SwitchField
              name="voiceControl"
              label="Enable voice input"
              description="Off by default. Turning it on loads the speech engine; the model downloads the first time it is needed."
            />
            {enabled && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <LanguageSelect />
                <ModelPicker catalog={catalog} />
                <HotkeyRecorder />
                <InputDeviceSelect />
                <NumberSetting
                  name="voiceAutoStop"
                  label="Stop after silence (seconds)"
                  description="Listening ends on its own after this much quiet. 0 keeps listening until you stop it."
                  min={0}
                  max={120}
                />
                <NumberSetting
                  name="voiceThreads"
                  label="Decoder threads"
                  description="More threads decode faster on a machine with cores to spare."
                  min={1}
                  max={8}
                />
                <div className="md:col-span-2">
                  <ModelHostSetting />
                </div>
                <div className="md:col-span-2">
                  <FormItem>
                    <FormLabel>Try it</FormLabel>
                    <Input
                      placeholder="Click here, press the hotkey and speak…"
                      className="text-foreground"
                    />
                  </FormItem>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
