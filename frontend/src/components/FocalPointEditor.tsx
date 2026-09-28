import { useCallback, useRef } from "react";
import "./AdminMedia.css";

type FocalPointEditorProps = {
  src: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Crop by choosing what matters: click or drag on the picture to set the focal point,
 * and see exactly how the hero crops on a wide screen and on a phone.
 */
export function FocalPointEditor({ src, x, y, onChange }: FocalPointEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const setFromPointer = useCallback(
    (e: React.PointerEvent) => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      onChange(clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100));
    },
    [onChange]
  );

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    let nx = x;
    let ny = y;
    if (e.key === "ArrowLeft") nx -= step;
    else if (e.key === "ArrowRight") nx += step;
    else if (e.key === "ArrowUp") ny -= step;
    else if (e.key === "ArrowDown") ny += step;
    else return;
    e.preventDefault();
    onChange(clamp(nx), clamp(ny));
  };

  return (
    <div className="fpe">
      <div className="fpe__stage">
      <div
        ref={stageRef}
        className="fpe__frame"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && setFromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <img src={src} alt="" draggable={false} />
        <span className="fpe__thirds" aria-hidden />
        <span className="fpe__line fpe__line--v" style={{ left: `${x}%` }} aria-hidden />
        <span className="fpe__line fpe__line--h" style={{ top: `${y}%` }} aria-hidden />
        <button
          type="button"
          className="fpe__dot"
          style={{ left: `${x}%`, top: `${y}%` }}
          onKeyDown={onKey}
          aria-label={`Focal point ${x}% across, ${y}% down. Use arrow keys to move.`}
        />
      </div>
      </div>

      <p className="fpe__hint">
        Click or drag to choose the part of the picture that must stay in frame.
        <button type="button" className="fpe__reset" onClick={() => onChange(50, 50)}>
          Centre
        </button>
        <span className="fpe__coords">
          {x}% · {y}%
        </span>
      </p>

      <div className="fpe__previews">
        <figure className="fpe__prev fpe__prev--wide">
          <span style={{ backgroundImage: `url(${src})`, backgroundPosition: `${x}% ${y}%` }} />
          <figcaption>Wide screen</figcaption>
        </figure>
        <figure className="fpe__prev fpe__prev--tall">
          <span style={{ backgroundImage: `url(${src})`, backgroundPosition: `${x}% ${y}%` }} />
          <figcaption>Phone</figcaption>
        </figure>
      </div>
    </div>
  );
}
