import { useEffect, useState } from "react";

export function SmoothScrollNotice() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const hide = () => setHidden(true);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("wheel", hide, { passive: true });
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("wheel", hide);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="smooth-scroll-notice" aria-hidden="true">
      Smooth Scroll
      <small>This will hide itself!</small>
    </div>
  );
}
