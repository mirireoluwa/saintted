import { useTheme } from "../contexts/ThemeContext";
import "./ThemeToggle.css";

type ThemeToggleProps = {
  /** When true, sits inline (e.g. header) instead of fixed corner. */
  embedded?: boolean;
  className?: string;
};

function IconMoon() {
  return (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="theme-toggle__icon" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}

export function ThemeToggle({ embedded, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const switchingTo = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className={["theme-toggle", embedded && "theme-toggle--embedded", className].filter(Boolean).join(" ")}
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Use dark mode" : "Use light mode"}
    >
      <span className="theme-toggle__label">{switchingTo}</span>
      {theme === "light" ? <IconMoon /> : <IconSun />}
    </button>
  );
}
