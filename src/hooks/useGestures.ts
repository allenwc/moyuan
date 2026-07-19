import { useCallback, useEffect, useRef } from "react";
import { clamp } from "@/lib/utils";

export interface GestureHandlers {
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number, centerX: number, centerY: number) => void;
  onStartNodeDrag?: (pointerId: number, x: number, y: number) => boolean;
  onNodeDrag?: (pointerId: number, x: number, y: number) => void;
  onEndNodeDrag?: (pointerId: number) => void;
  onTap?: (x: number, y: number, target: "canvas" | string) => void;
  onLongPress?: (x: number, y: number, target: string) => void;
}

interface PointerInfo {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  target: string;
}

export interface UseGesturesOptions {
  minScale?: number;
  maxScale?: number;
  longPressMs?: number;
  longPressMoveTolerance?: number;
  tapMoveTolerance?: number;
  wheelZoomFactor?: number;
}

export function useCanvasGestures(
  el: HTMLElement | SVGElement | null,
  handlers: GestureHandlers,
  options: UseGesturesOptions = {},
) {
  const {
    minScale = 0.25,
    maxScale = 3,
    longPressMs = 480,
    longPressMoveTolerance = 8,
    tapMoveTolerance = 6,
    wheelZoomFactor = 0.0015,
  } = options;

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const optionsRef = useRef({ minScale, maxScale });
  optionsRef.current = { minScale, maxScale };

  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  const panLastCenter = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const dragNodePointerId = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number; target: string } | null>(
    null,
  );
  const movedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getTwoPtr = useCallback(() => {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    const a = pts[0];
    const b = pts[1];
    return {
      x: (a.lastX + b.lastX) / 2,
      y: (a.lastY + b.lastY) / 2,
      dist: Math.hypot(b.lastX - a.lastX, b.lastY - a.lastY),
    };
  }, []);

  const resolveTarget = useCallback((target: EventTarget | null): string => {
    const targetEl = (target as Element)?.closest?.("[data-target]");
    return targetEl?.getAttribute("data-target") ?? "canvas";
  }, []);

  const handleDown = useCallback(
    (id: number, x: number, y: number, target: string) => {
      const info: PointerInfo = {
        id,
        startX: x,
        startY: y,
        lastX: x,
        lastY: y,
        target,
      };
      pointers.current.set(id, info);
      movedRef.current = false;
      pointerStart.current = { x, y, target };

      if (pointers.current.size === 1 && target.startsWith("node:")) {
        const handled = handlersRef.current.onStartNodeDrag?.(id, x, y);
        if (handled) {
          dragNodePointerId.current = id;
        }
      }

      if (pointers.current.size === 1) {
        panLastCenter.current = { x, y };
        clearLongPress();
        longPressTimer.current = setTimeout(() => {
          if (!movedRef.current && pointerStart.current) {
            if (dragNodePointerId.current !== null) {
              const pid = dragNodePointerId.current;
              dragNodePointerId.current = null;
              handlersRef.current.onEndNodeDrag?.(pid);
            }
            handlersRef.current.onLongPress?.(
              pointerStart.current.x,
              pointerStart.current.y,
              pointerStart.current.target,
            );
            longPressTimer.current = null;
            pointerStart.current = null;
            movedRef.current = false;
          }
        }, longPressMs);
      } else if (pointers.current.size === 2) {
        clearLongPress();
        const two = getTwoPtr();
        if (two) {
          panLastCenter.current = { x: two.x, y: two.y };
          pinchStartDist.current = two.dist;
        }
        dragNodePointerId.current = null;
      }
    },
    [clearLongPress, getTwoPtr, longPressMs],
  );

  const handleMove = useCallback(
    (id: number, x: number, y: number) => {
      const info = pointers.current.get(id);
      if (!info) return;
      const prevX = info.lastX;
      const prevY = info.lastY;
      info.lastX = x;
      info.lastY = y;

      const dx = x - info.startX;
      const dy = y - info.startY;
      if (Math.hypot(dx, dy) > longPressMoveTolerance) {
        clearLongPress();
      }
      if (
        pointerStart.current &&
        Math.hypot(
          x - pointerStart.current.x,
          y - pointerStart.current.y,
        ) > tapMoveTolerance
      ) {
        movedRef.current = true;
      }

      if (pointers.current.size >= 2) {
        const two = getTwoPtr();
        if (two && panLastCenter.current) {
          if (pinchStartDist.current && two.dist > 4) {
            const factor = two.dist / pinchStartDist.current;
            handlersRef.current.onZoom(factor, two.x, two.y);
            pinchStartDist.current = two.dist;
          }
          const pdx = two.x - panLastCenter.current.x;
          const pdy = two.y - panLastCenter.current.y;
          handlersRef.current.onPan(pdx, pdy);
          panLastCenter.current = { x: two.x, y: two.y };
        }
        return;
      }

      if (dragNodePointerId.current === id) {
        handlersRef.current.onNodeDrag?.(id, x, y);
        return;
      }

      if (panLastCenter.current) {
        const ddx = x - prevX;
        const ddy = y - prevY;
        handlersRef.current.onPan(ddx, ddy);
        panLastCenter.current = { x, y };
      }
    },
    [clearLongPress, getTwoPtr, longPressMoveTolerance, tapMoveTolerance],
  );

  const handleUp = useCallback(
    (id: number, x: number, y: number) => {
      clearLongPress();
      pointers.current.delete(id);

      if (dragNodePointerId.current === id) {
        handlersRef.current.onEndNodeDrag?.(id);
        dragNodePointerId.current = null;
      }

      if (pointers.current.size === 1) {
        const remaining = Array.from(pointers.current.values())[0];
        panLastCenter.current = { x: remaining.lastX, y: remaining.lastY };
        pinchStartDist.current = null;
      } else if (pointers.current.size === 0) {
        panLastCenter.current = null;
        pinchStartDist.current = null;
        if (!movedRef.current && pointerStart.current) {
          handlersRef.current.onTap?.(
            x,
            y,
            pointerStart.current.target,
          );
        }
        pointerStart.current = null;
        movedRef.current = false;
      }
    },
    [clearLongPress],
  );

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        handleDown(
          touch.identifier,
          touch.clientX,
          touch.clientY,
          resolveTarget(touch.target),
        );
      }
      if (e.cancelable) e.preventDefault();
    },
    [handleDown, resolveTarget],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        handleMove(touch.identifier, touch.clientX, touch.clientY);
      }
      if (e.cancelable) e.preventDefault();
    },
    [handleMove],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        handleUp(touch.identifier, touch.clientX, touch.clientY);
      }
      if (e.cancelable) e.preventDefault();
    },
    [handleUp],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      handleDown(e.pointerId, e.clientX, e.clientY, resolveTarget(e.target));
    },
    [handleDown, resolveTarget],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      handleMove(e.pointerId, e.clientX, e.clientY);
    },
    [handleMove],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      handleUp(e.pointerId, e.clientX, e.clientY);
    },
    [handleUp],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * wheelZoomFactor);
      handlersRef.current.onZoom(factor, e.clientX, e.clientY);
    },
    [wheelZoomFactor],
  );

  useEffect(() => {
    const node = el as HTMLElement | null;
    if (!node) return;

    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: false });
    node.addEventListener("touchcancel", onTouchEnd, { passive: false });

    node.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    node.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      node.removeEventListener("wheel", onWheel);
      clearLongPress();
    };
  }, [
    el,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    clearLongPress,
  ]);

  return {
    clampScale: (s: number) =>
      clamp(s, optionsRef.current.minScale, optionsRef.current.maxScale),
  };
}
