import { ArrowDownToLine, ArrowUpToLine, Trash2 } from "lucide-react";
import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";

import { OutfitItemImage } from "@/components/outfits/outfit-item-image";
import { Button } from "@/components/ui/button";
import {
  KEY_STEP,
  moveItemBy,
  moveItemTo,
  placementStyle,
  removeItem,
  resizeItem,
  restack,
  SCALE_MAX,
  SCALE_MIN,
  type CanvasItem,
} from "@/lib/outfit-canvas";

type OutfitCanvasProps = {
  items: CanvasItem[];
  selectedId: string | null;
  onSelect: (itemId: string | null) => void;
  onChange: (items: CanvasItem[]) => void;
};

type Drag = {
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
};

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

// Drag with mouse, pen or finger (pointer events); with the keyboard, focus an
// item and use the arrow keys. Positions stay relative to the canvas.
export function OutfitCanvas({ items, selectedId, onSelect, onChange }: OutfitCanvasProps) {
  const id = useId();
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // The latest items, for pointer moves that arrive between renders.
  const latest = useRef(items);
  latest.current = items;

  const selected = items.find((item) => item.itemId === selectedId) ?? null;

  function startDrag(event: PointerEvent<HTMLDivElement>, item: CanvasItem) {
    if (event.button !== 0 || canvas.current === null) return;
    const rect = canvas.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    onSelect(item.itemId);
    drag.current = {
      itemId: item.itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
      width: rect.width,
      height: rect.height,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    const x = current.originX + (event.clientX - current.startX) / current.width;
    const y = current.originY + (event.clientY - current.startY) / current.height;
    onChange(moveItemTo(latest.current, current.itemId, x, y));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function remove(itemId: string) {
    onChange(removeItem(items, itemId));
    onSelect(null);
    canvas.current?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>, item: CanvasItem) {
    const arrow = ARROWS[event.key];
    const step = event.shiftKey ? KEY_STEP * 5 : KEY_STEP;
    if (arrow) {
      onChange(moveItemBy(items, item.itemId, arrow[0] * step, arrow[1] * step));
    } else if (event.key === "Delete" || event.key === "Backspace") {
      remove(item.itemId);
    } else if (event.key === "+" || event.key === "=") {
      onChange(resizeItem(items, item.itemId, item.scale + 0.1));
    } else if (event.key === "-") {
      onChange(resizeItem(items, item.itemId, item.scale - 0.1));
    } else {
      return;
    }
    event.preventDefault();
  }

  return (
    <div className="outfit-canvas-wrap">
      <p id={`${id}-help`} className="outfit-hint">
        Ziehe Teile an ihren Platz. Mit der Tastatur: Teil mit Tab auswählen, mit den Pfeiltasten
        verschieben (mit Umschalt in großen Schritten), mit Plus und Minus vergrößern oder
        verkleinern, mit Entf entfernen.
      </p>
      <div
        ref={canvas}
        className="outfit-canvas"
        role="group"
        aria-label="Outfit-Fläche"
        aria-describedby={`${id}-help`}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
      >
        {items.length === 0 && (
          <p className="outfit-canvas-empty">Wähle Teile aus, um dein Outfit zusammenzustellen.</p>
        )}
        {items.map((item, index) => (
          <div
            key={item.itemId}
            role="button"
            tabIndex={0}
            aria-pressed={item.itemId === selectedId}
            aria-label={item.name}
            className="outfit-canvas-item outfit-canvas-item--interactive"
            data-selected={item.itemId === selectedId || undefined}
            style={placementStyle(item, index)}
            onFocus={() => onSelect(item.itemId)}
            onPointerDown={(event) => startDrag(event, item)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => handleKey(event, item)}
          >
            <OutfitItemImage name={item.name} thumbnailKey={item.thumbnailKey} />
          </div>
        ))}
      </div>

      {selected && (
        <div className="outfit-controls" aria-label={`Ausgewählt: ${selected.name}`} role="group">
          <p className="outfit-controls-name">{selected.name}</p>
          <div className="outfit-size">
            <label htmlFor={`${id}-size`} className="wardrobe-field-label">
              Größe
            </label>
            <input
              id={`${id}-size`}
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              value={selected.scale}
              aria-valuetext={`${Math.round(selected.scale * 100)} %`}
              onChange={(event) =>
                onChange(resizeItem(items, selected.itemId, Number(event.target.value)))
              }
            />
          </div>
          <div className="outfit-controls-buttons">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onChange(restack(items, selected.itemId, 1))}
            >
              <ArrowUpToLine aria-hidden="true" />
              Nach vorne
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onChange(restack(items, selected.itemId, -1))}
            >
              <ArrowDownToLine aria-hidden="true" />
              Nach hinten
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => remove(selected.itemId)}
            >
              <Trash2 aria-hidden="true" />
              Entfernen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
