import type { Theme } from "@/providers/ThemeProvider";
import type { LucideIcon } from "lucide-react";
import {
  Bug,
  Home,
  Laptop,
  MonitorCog,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sun,
  SunMoon,
  UserPlus,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type AppCommandContext = {
  navigate: (to: string) => void;
  openDialog: (id: string, props: Record<string, unknown>, options?: unknown) => void;
  toggleDebug: () => void;
  reconnect: () => void;
  clearCaches: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export type AppCommand = {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Extra words that should find this command but need not be shown. */
  keywords?: string[];
  /** Needs the Electron bridge; hidden in the browser build. */
  electronOnly?: boolean;
  run: (ctx: AppCommandContext) => void;
};

/**
 * The app's own verbs, as palette rows.
 *
 * Note the reload / devtools entries are not a convenience. Linux runs
 * frameless (see `CHROME_OPTIONS` in WindowManager), and a frameless window has
 * no application menu at all — so the palette is the ONLY way to reach Reload,
 * Force Reload and DevTools there. Removing them from this list breaks Linux.
 */
export const APP_COMMANDS: AppCommand[] = [
  {
    id: "go-home",
    title: "Go to Dashboard",
    icon: Home,
    keywords: ["home", "start"],
    run: ({ navigate }) => navigate("/"),
  },
  {
    id: "open-settings",
    title: "Open Settings",
    icon: Settings,
    keywords: ["preferences", "config"],
    run: ({ navigate }) => navigate("/settings"),
  },
  {
    id: "switch-organization",
    title: "Switch Organization",
    description: "Change which organization you are working in",
    icon: Search,
    keywords: ["account", "profile", "org", "tenant"],
    run: ({ navigate }) => navigate("/"),
  },
  {
    id: "add-account",
    title: "Add Account or Organization",
    icon: UserPlus,
    keywords: ["sign in", "login", "connect"],
    run: ({ openDialog }) => openDialog("addprofile", {}, { size: "small" }),
  },
  {
    id: "toggle-theme",
    title: "Toggle Light / Dark Mode",
    icon: SunMoon,
    keywords: ["theme", "appearance", "colour", "color"],
    run: ({ toggleTheme }) => toggleTheme(),
  },
  {
    id: "theme-light",
    title: "Use Light Mode",
    icon: Sun,
    keywords: ["theme", "appearance", "bright"],
    run: ({ setTheme }) => setTheme("light"),
  },
  {
    id: "theme-dark",
    title: "Use Dark Mode",
    icon: Moon,
    keywords: ["theme", "appearance"],
    run: ({ setTheme }) => setTheme("dark"),
  },
  {
    id: "theme-system",
    title: "Follow System Theme",
    description: "Light or dark, whichever the OS is using",
    icon: Laptop,
    keywords: ["theme", "appearance", "auto"],
    run: ({ setTheme }) => setTheme("system"),
  },
  {
    id: "toggle-debug",
    title: "Toggle Debug Mode",
    icon: Bug,
    run: ({ toggleDebug }) => toggleDebug(),
  },
  {
    id: "reconnect",
    title: "Reconnect to Services",
    icon: RefreshCw,
    keywords: ["retry", "refresh connection"],
    run: ({ reconnect }) => reconnect(),
  },
  {
    id: "clear-caches",
    title: "Clear Service Caches",
    icon: RotateCcw,
    keywords: ["apollo", "cache"],
    run: ({ clearCaches }) => clearCaches(),
  },
  {
    id: "reload-window",
    title: "Reload Window",
    icon: RotateCcw,
    electronOnly: true,
    run: () => void window.api?.reloadWindow(),
  },
  {
    id: "force-reload-window",
    title: "Force Reload Window",
    description: "Reload ignoring the cache",
    icon: RotateCcw,
    electronOnly: true,
    run: () => void window.api?.forceReloadWindow(),
  },
  {
    id: "open-devtools",
    title: "Toggle Developer Tools",
    icon: MonitorCog,
    keywords: ["inspect", "console"],
    electronOnly: true,
    run: () => void window.api?.openDevTools(),
  },
  {
    id: "zoom-in",
    title: "Zoom In",
    icon: ZoomIn,
    electronOnly: true,
    run: () => void window.api?.getZoomLevel().then((r) => {
      const level = r?.zoomLevel ?? 1;
      void window.api?.setZoomLevel(Math.min(level + 0.1, 3));
    }),
  },
  {
    id: "zoom-out",
    title: "Zoom Out",
    icon: ZoomOut,
    electronOnly: true,
    run: () => void window.api?.getZoomLevel().then((r) => {
      const level = r?.zoomLevel ?? 1;
      void window.api?.setZoomLevel(Math.max(level - 0.1, 0.3));
    }),
  },
];
