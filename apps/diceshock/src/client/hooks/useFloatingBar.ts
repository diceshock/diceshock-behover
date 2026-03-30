import { useCallback, useEffect, useRef, useState } from "react";

export interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = "diceshock_floating_bar_pos";
const DRAG_THRESHOLD = 5;

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePosition(pos: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}

function snapToEdge(
  x: number,
  y: number,
  barW: number,
  barH: number,
): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = x + barW / 2;
  const distLeft = centerX;
  const distRight = vw - centerX;

  const snappedX = distLeft < distRight ? 8 : vw - barW - 8;
  const snappedY = Math.max(8, Math.min(y, vh - barH - 8));

  return { x: snappedX, y: snappedY };
}

export default function useFloatingBar() {
  const [position, setPosition] = useState<Position>({ x: 8, y: 100 });
  const barRef = useRef<HTMLDivElement | null>(null);
  const wasDragRef = useRef(false);

  useEffect(() => {
    const saved = loadPosition();
    if (saved) setPosition(saved);
  }, []);

  const endDrag = useCallback(
    (deltaX: number, deltaY: number) => {
      const absDelta = Math.abs(deltaX) + Math.abs(deltaY);
      wasDragRef.current = absDelta > DRAG_THRESHOLD;

      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;
      const snapped = snapToEdge(newX, newY, rect.width, rect.height);
      setPosition(snapped);
      savePosition(snapped);
    },
    [position],
  );

  return {
    barRef,
    position,
    wasDragRef,
    endDrag,
  };
}
