import { useTheme } from "../contexts/ThemeContext";
import "./ThemeToggle.css";

type ThemeToggleProps = {
  /** When true, sits inline (e.g. header) instead of fixed corner. */
  embedded?: boolean;
  className?: string;
};

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
      <span className="theme-toggle__arrow" aria-hidden>
        →
      </span>
    </button>
  );
}
