import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

/** What the user chose. `system` follows the OS and can change under us. */
export type Theme = "light" | "dark" | "system";
/** What is actually on screen. */
export type ResolvedTheme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  /** `theme` with `system` resolved against the OS, kept live as the OS changes. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /**
   * Flip between light and dark, from whatever is on screen now. Leaving
   * `system` on a toggle is deliberate: someone who presses "dark" means dark,
   * not "dark until my OS decides otherwise".
   */
  toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const systemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : defaultTheme;
  });
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  // Follow the OS while on `system` — a laptop switching to dark at sunset
  // should take the app with it, not wait for a reload.
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const query = window.matchMedia(DARK_QUERY);
    const sync = () => setSystem(query.matches ? "dark" : "light");
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [theme]);

  // Every window keeps its own copy of the choice over one localStorage key,
  // and main's native theme is global — a window that stayed on the theme it
  // booted with would fight the others over it. The `storage` event fires
  // only in the OTHER windows, so this cannot ping-pong.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && isTheme(event.newValue)) setThemeState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const resolvedTheme: ResolvedTheme = theme === "system" ? system : theme;

  // Before paint, so the first frame is already in the chosen mode.
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    // The window frame has parts CSS cannot reach (the background Chromium
    // paints during a resize, Windows' overlay glyphs); main recolours them.
    // Optional all the way down: a browser tab has no frame of ours. The
    // chosen mode rides along because main mirrors it into the native theme
    // (the vibrancy material follows it), and "system" must stay "system"
    // there or the OS query this component resolves it from stops changing.
    window.api?.windowControls?.setTheme?.(resolvedTheme, theme);
  }, [resolvedTheme, theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      localStorage.setItem(storageKey, next);
      setThemeState(next);
    },
    [storageKey],
  );

  const toggleTheme = useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
