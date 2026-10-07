import { useSettingsStore } from "@/core/settings/store/SettingsContext";
import type { Settings } from "@/core/settings/store/validator";

/** The drop shadow per `menuShadow` setting. Literal classes: Tailwind must see them. */
export const MENU_SHADOW: Record<Settings["menuShadow"], string> = {
  none: "shadow-none",
  soft: "shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]",
  medium: "shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]",
  strong: "shadow-[0_30px_70px_-14px_rgba(0,0,0,0.8)]",
};

/** The smart menu's frame: a faint primary ring and the shadow the user chose. */
export const useMenuChrome = () => {
  const shadow = useSettingsStore((state) => state.settings?.menuShadow ?? "medium");
  return `ring-1 ring-primary/25 ${MENU_SHADOW[shadow] ?? MENU_SHADOW.medium}`;
};
