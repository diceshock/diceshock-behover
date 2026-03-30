import { DragDropProvider, useDraggable } from "@dnd-kit/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { type MutableRefObject, useEffect, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import useFloatingBar, { type Position } from "@/client/hooks/useFloatingBar";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import trpcClientPublic from "@/shared/utils/trpc";

interface ActiveOccupancy {
  code: string;
  name: string;
  startAt: number;
  paused: boolean;
}

function formatElapsed(startAt: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function DraggableBar({
  occupancy,
  elapsed,
  barRef,
  position,
  wasDragRef,
}: {
  occupancy: ActiveOccupancy;
  elapsed: string;
  barRef: MutableRefObject<HTMLDivElement | null>;
  position: Position;
  wasDragRef: MutableRefObject<boolean>;
}) {
  const navigate = useNavigate();
  const { ref, handleRef, isDragging } = useDraggable({
    id: "floating-occupancy-bar",
  });

  return (
    <div
      ref={(el) => {
        barRef.current = el;
        ref(el);
        handleRef(el);
      }}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 999,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-medium transition-colors ${
          occupancy.paused
            ? "bg-warning text-warning-content"
            : "bg-primary text-primary-content"
        }`}
        onClick={() => {
          if (wasDragRef.current) return;
          wasDragRef.current = false;
          navigate({
            to: "/t/$code",
            params: { code: occupancy.code },
            search: { from: "" },
          });
        }}
      >
        <span className="truncate max-w-[120px]">{occupancy.name}</span>
        <span className="font-mono text-xs opacity-80">{elapsed}</span>
        <span
          className={`w-2 h-2 rounded-full ${occupancy.paused ? "bg-warning-content/50" : "animate-pulse bg-primary-content/70"}`}
        />
      </button>
    </div>
  );
}

export default function FloatingOccupancyBar() {
  const { userInfo } = useAuth();
  const { tempIdentity } = useTempIdentity();
  const location = useLocation();
  const { barRef, position, wasDragRef, endDrag } = useFloatingBar();

  const [occupancy, setOccupancy] = useState<ActiveOccupancy | null>(null);
  const [elapsed, setElapsed] = useState("");

  const isOnTPage =
    location.pathname.startsWith("/t/") ||
    location.pathname.startsWith("/ready/");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        let active: {
          code: string;
          name: string;
          startAt?: number;
          paused?: boolean;
        } | null = null;

        if (userInfo) {
          active = await trpcClientPublic.tables.getMyActiveOccupancy.query();
        } else if (tempIdentity) {
          active = await trpcClientPublic.tempIdentity.getActiveOccupancy.query(
            {
              tempId: tempIdentity.tempId,
            },
          );
        }

        if (cancelled) return;

        if (active) {
          setOccupancy({
            code: active.code,
            name: active.name,
            startAt: active.startAt ?? Date.now(),
            paused: active.paused ?? false,
          });
        } else {
          setOccupancy(null);
        }
      } catch {
        if (!cancelled) setOccupancy(null);
      }
    };

    void check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userInfo, tempIdentity]);

  useEffect(() => {
    if (!occupancy) return;
    const update = () => setElapsed(formatElapsed(occupancy.startAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [occupancy]);

  if (!occupancy || isOnTPage) return null;

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { x, y } = event.operation.transform;
        endDrag(x, y);
      }}
    >
      <DraggableBar
        occupancy={occupancy}
        elapsed={elapsed}
        barRef={barRef}
        position={position}
        wasDragRef={wasDragRef}
      />
    </DragDropProvider>
  );
}
