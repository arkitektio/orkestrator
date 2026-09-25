import { VoiceSettingsCard } from "@/core/voice";
import { SettingsForm } from "../components/SettingsForm";
import { SettingsPage } from "../components/SettingsPage";

/** The voice card writes its `voice*` keys through the shared auto-saving form. */
export const VoicePage = () => (
  <SettingsPage slug="voice">
    <SettingsForm>
      <VoiceSettingsCard />
    </SettingsForm>
  </SettingsPage>
);

export default VoicePage;
