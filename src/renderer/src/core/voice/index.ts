/**
 * Voice input: dictation into the search bar and any text field, recognised
 * on this computer by a speech model in a utility process.
 *
 *   VoiceInput          – the opt-in gate; mounts the runtime only when on
 *   VoiceIsland         – rail row while a model downloads / loads / fails
 *   VoicePaletteBadge   – the microphone in the palette's input row
 *   VoiceSettingsCard   – Settings → Voice input
 *
 * Everything else in this folder is internal.
 */
export { VoiceInput } from "./VoiceInput";
export { VoiceIsland } from "./VoiceIsland";
export { VoicePaletteBadge } from "./ui/VoiceMicBadge";
export { VoiceSettingsCard } from "./settings/VoiceSettingsCard";
export { useVoiceState } from "./store";
