import { useRef, useState } from "react";
import "./AdminSortable.css";

type AdminSortableListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  /** Called once when an item settles in a new place (drag drop or the arrow buttons). */
  onMove: (fromIndex: number, toIndex: number) => void;
  /** The item's main content (thumbnail, title, chips). */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Edit / delete buttons and the like, on the right. */
  renderActions?: (item: T, index: number) => React.ReactNode;
  getLabel: (item: T) => string;
  empty?: React.ReactNode;
};

/**
 * One ordering system for tracks, videos and photos. Positions are simply the list order (1, 2, 3…),
 * so there are no order numbers to type or clash. Drag the grip (mouse or finger), or use the arrows.
 */
export function AdminSortableList<T>({
  items,
  getKey,
  onMove,
  renderItem,
  renderActions,
  getLabel,
  empty,
}: AdminSortableListProps<T>) {
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [drag, setDrag] = useState<{ from: number; over: number; dy: number } | null>(null);
  const startY = useRef(0);

  const overIndexFor = (clientY: number, from: number) => {
    let over = from;
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (clientY > r.top + r.height / 2 && i > from) over = Math.max(over, i);
      if (clientY < r.top + r.height / 2 && i < from) over = Math.min(over, i);
    });
    return over;
  };

  const onPointerDown = (e: React.PointerEvent, from: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDrag({ from, over: from, dy: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ from: drag.from, over: overIndexFor(e.clientY, drag.from), dy: e.clientY - startY.current });
  };
  const finish = (commit: boolean) => {
    if (drag && commit && drag.over !== drag.from) onMove(drag.from, drag.over);
    setDrag(null);
  };

  if (items.length === 0) return <>{empty ?? <p className="sortable__empty">Nothing here yet.</p>}</>;

  return (
    <ol className={`sortable${drag ? " sortable--dragging" : ""}`}>
      {items.map((item, i) => {
        const dragging = drag?.from === i;
        const isTarget = drag && drag.over === i && drag.from !== i;
        const dir = drag && drag.over > drag.from ? "after" : "before";
        return (
          <li
            key={getKey(item)}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            className={`sortable__row${dragging ? " sortable__row--lifted" : ""}${
              isTarget ? ` sortable__row--target sortable__row--target-${dir}` : ""
            }`}
            style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}
          >
            <span className="sortable__pos" aria-hidden>
              {i + 1}
            </span>
            <button
              type="button"
              className="sortable__grip"
              aria-label={`Drag to reorder ${getLabel(item)}`}
              title="Drag to reorder"
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={() => finish(true)}
              onPointerCancel={() => finish(false)}
            >
              <span aria-hidden />
            </button>
            <div className="sortable__main">{renderItem(item, i)}</div>
            <div className="sortable__move">
              <button
                type="button"
                aria-label={`Move ${getLabel(item)} up`}
                disabled={i === 0}
                onClick={() => onMove(i, i - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${getLabel(item)} down`}
                disabled={i === items.length - 1}
                onClick={() => onMove(i, i + 1)}
              >
                ↓
              </button>
            </div>
            {renderActions ? <div className="sortable__actions">{renderActions(item, i)}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}
