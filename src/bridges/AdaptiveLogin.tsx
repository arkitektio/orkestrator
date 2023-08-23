import { TauriLogin } from "./TauriLogin";
import { WebLogin } from "./WebLogin";

export const AdaptiveLogin = (props: any) => {
  return window.__TAURI__ ? <TauriLogin /> : <WebLogin />;
};
