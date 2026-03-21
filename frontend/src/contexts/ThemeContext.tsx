import {
  createContext,
  useContext,
  useLayoutEffect,
  useEffect,
  useState,
  useMemo,
} from "react";

type Theme = "light" | "dark";
type ThemeMode = "system" | Theme;

const MODE_KEY = "saintted-theme-mode";
/** Legacy key — migrated once to MODE_KEY */
const LEGACY_THEME_KEY = "saintted-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(MODE_KEY) as ThemeMode | null;
  if (raw === "system" || raw === "light" || raw === "dark") return raw;
  const legacy = localStorage.getItem(LEGACY_THEME_KEY) as Theme | null;
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

function persistMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [osPrefersLight, setOsPrefersLight] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setOsPrefersLight(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = useMemo(() => {
    if (mode === "light" || mode === "dark") return mode;
    return osPrefersLight ? "light" : "dark";
  }, [mode, osPrefersLight]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useLayoutEffect(() => {
    persistMode(mode);
  }, [mode]);

  const setTheme = (next: Theme) => {
    setModeState(next);
  };

  /** Switches to explicit light/dark (user choice); stops following system until cleared via site data. */
  const toggleTheme = () => {
    setModeState(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
