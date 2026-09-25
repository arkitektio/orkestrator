import type { VoiceEngineStatus } from "../../../../main/voice/protocol";

/**
 * When the rail says anything about voice input. Pure, like the agent's
 * `shouldShowAgentIsland`, so the rule is testable without mounting.
 *
 * Only while something is happening that the user is waiting on or needs to
 * know: a model downloading or loading, or an engine that failed. Ready is
 * silence — the badge appears when dictation actually starts.
 */
export const shouldShowVoiceIsland = (state: {
  enabled: boolean;
  status: VoiceEngineStatus;
}): boolean =>
  state.enabled &&
  (state.status === "starting" || state.status === "downloading" || state.status === "error");
