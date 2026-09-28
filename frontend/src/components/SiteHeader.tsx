import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./SiteHeader.css";

const NAV = [
  { to: "/music", label: "music" },
  { to: "/media", label: "media" },
  { to: "/shows", label: "shows" },
  { to: "/about", label: "about" },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // Phones: the nav is a dropdown. Close it on navigation, Escape, or a tap outside.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={`site-header${pathname === "/" ? " site-header--overlay" : ""}${open ? " site-header--open" : ""}`} id="top">
      <div className="wrap">
        <Link to="/" className="brand" aria-label="saintted — home">
          saintted
          <span className="seal" aria-hidden />
        </Link>

        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="menu-btn__icon" aria-hidden />
        </button>

        <nav className="nav" id="site-nav" aria-label="Main">
          {NAV.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={pathname === l.to || pathname.startsWith(`${l.to}/`) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
