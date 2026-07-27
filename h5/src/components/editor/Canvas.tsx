import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasGestures } from "@/hooks/useGestures";
import type { CanvasProps } from "./canvasTypes";
import { CharacterNode } from "./CharacterNode";
import { RelationEdge } from "./RelationEdge";
import { EditorEmpty } from "./EditorEmpty";

export function Canvas({
  characters,
  relations,
  viewport,
  focusedCharacterId,
  selectedRelationId,
  connectingFromId,
  onViewportChange,
  onFocusCharacter,
  onEditCharacter,
  onSelectRelation,
  onStartConnect,
  onCompleteConnect,
  onCancelConnect,
  onUpdatePosition,
  onCommitPosition,
  onAddCharacterAt,
  clampScale,
  relationGuideOpen = false,
  onDismissRelationGuide,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragStartWorld = useRef<{ x: number; y: number } | null>(null);
  const positionChangedRef = useRef(false);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    const vp = viewportRef.current;
    const x = clientX - left;
    const y = clientY - top;
    return {
      x: (x - vp.x) / vp.scale,
      y: (y - vp.y) / vp.scale,
    };
  }, []);

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      onViewportChange((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    },
    [onViewportChange],
  );

  const handleZoom = useCallback(
    (factor: number, cx: number, cy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const px = cx - left;
      const py = cy - top;
      onViewportChange((prev) => {
        const newScale = clampScale(prev.scale * factor);
        const k = newScale / prev.scale;
        return {
          scale: newScale,
          x: px - (px - prev.x) * k,
          y: py - (py - prev.y) * k,
        };
      });
    },
    [onViewportChange, clampScale],
  );

  const handleStartNodeDrag = useCallback(
    (_pointerId: number, x: number, y: number) => {
      const element = document.elementFromPoint(x, y) as Element | null;
      const targetEl = element?.closest?.("[data-target]");
      const target = targetEl?.getAttribute("data-target") ?? "";
      if (!target.startsWith("node:")) return false;
      const id = target.slice(5);
      const c = characters.find((cc) => cc.id === id);
      if (!c) return false;
      const world = screenToWorld(x, y);
      dragOffset.current = { dx: world.x - c.x, dy: world.y - c.y };
      dragStartWorld.current = { x: c.x, y: c.y };
      dragIdRef.current = id;
      positionChangedRef.current = false;
      return true;
    },
    [characters, screenToWorld],
  );

  const handleNodeDrag = useCallback(
    (_pointerId: number, x: number, y: number) => {
      const id = dragIdRef.current;
      if (!id) return;
      const world = screenToWorld(x, y);
      const nx = world.x - dragOffset.current.dx;
      const ny = world.y - dragOffset.current.dy;
      if (
        dragStartWorld.current &&
        Math.hypot(nx - dragStartWorld.current.x, ny - dragStartWorld.current.y) > 0.5
      ) {
        positionChangedRef.current = true;
      }
      onUpdatePosition(id, nx, ny);
    },
    [onUpdatePosition, screenToWorld],
  );

  const handleEndNodeDrag = useCallback(() => {
    const id = dragIdRef.current;
    if (id && positionChangedRef.current && dragStartWorld.current) {
      onCommitPosition(id, dragStartWorld.current.x, dragStartWorld.current.y);
    }
    dragIdRef.current = null;
    dragStartWorld.current = null;
    positionChangedRef.current = false;
  }, [onCommitPosition]);

  const handleTap = useCallback(
    (_x: number, _y: number, target: string) => {
      if (target === "canvas" || target === "") {
        if (connectingFromId) {
          onCancelConnect();
          return;
        }
        onFocusCharacter(null);
        onSelectRelation(null);
        return;
      }
      if (target.startsWith("node:")) {
        const id = target.slice(5);
        if (connectingFromId) {
          if (id === connectingFromId) {
            onCancelConnect();
            return;
          }
          onCompleteConnect(connectingFromId, id);
          return;
        }
        if (id === focusedCharacterId) {
          onEditCharacter(id);
          return;
        }
        onFocusCharacter(id);
        return;
      }
      if (target.startsWith("edge:")) {
        const id = target.slice(5);
        onSelectRelation(id);
      }
    },
    [
      connectingFromId,
      focusedCharacterId,
      onCancelConnect,
      onCompleteConnect,
      onEditCharacter,
      onFocusCharacter,
      onSelectRelation,
    ],
  );

  const handleLongPress = useCallback(
    (_x: number, _y: number, target: string) => {
      if (target.startsWith("node:")) {
        const id = target.slice(5);
        onStartConnect(id);
      } else if (target === "canvas" || target === "") {
        const world = screenToWorld(_x, _y);
        onAddCharacterAt(world.x, world.y);
      }
    },
    [onStartConnect, onAddCharacterAt, screenToWorld],
  );

  useCanvasGestures(
    svgRef.current,
    {
      onPan: handlePan,
      onZoom: handleZoom,
      onStartNodeDrag: handleStartNodeDrag,
      onNodeDrag: handleNodeDrag,
      onEndNodeDrag: handleEndNodeDrag,
      onTap: handleTap,
      onLongPress: handleLongPress,
    },
    { minScale: 0.25, maxScale: 3 },
  );

  // Hint when connecting
  const showHint = useMemo(() => connectingFromId !== null, [connectingFromId]);
  const fromChar = characters.find((c) => c.id === connectingFromId);

  // 一度邻居：焦点节点 + 直接相连人物
  const focusedNeighborIds = useMemo(() => {
    if (!focusedCharacterId) return new Set<string>();
    const ids = new Set<string>([focusedCharacterId]);
    for (const r of relations) {
      if (r.sourceId === focusedCharacterId) ids.add(r.targetId);
      if (r.targetId === focusedCharacterId) ids.add(r.sourceId);
    }
    return ids;
  }, [relations, focusedCharacterId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden canvas-area"
      style={{ background: "#f5efe2" }}
    >
      {characters.length === 0 && (
        <EditorEmpty
          onAdd={() => {
            const cx = (size.w / 2 - viewport.x) / viewport.scale;
            const cy = (size.h / 2 - viewport.y) / viewport.scale;
            onAddCharacterAt(cx, cy);
          }}
        />
      )}

      <svg
        ref={svgRef}
        width={size.w || "100%"}
        height={size.h || "100%"}
        className="absolute inset-0 block touch-none select-none"
        style={{ touchAction: "none" }}
      >
        <defs>
          <pattern
            id="canvas-grid"
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.x % (40 * viewport.scale)}, ${viewport.y % (40 * viewport.scale)}) scale(${viewport.scale})`}
          >
            <circle cx={0} cy={0} r={0.6} fill="rgba(31,27,22,0.16)" />
          </pattern>
          <radialGradient id="canvas-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(245,239,226,0)" />
            <stop offset="100%" stopColor="rgba(122,98,53,0.08)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-grid)" />
        <rect
          width="100%"
          height="100%"
          fill="url(#canvas-vignette)"
          pointerEvents="none"
        />

        <g
          transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}
        >
          {relations.map((r) => {
            const source = characters.find((c) => c.id === r.sourceId);
            const target = characters.find((c) => c.id === r.targetId);
            if (!source || !target) return null;
            const isSelected = r.id === selectedRelationId;
            const isRelated =
              focusedCharacterId !== null &&
              (r.sourceId === focusedCharacterId ||
                r.targetId === focusedCharacterId);
            const dimmed =
              (focusedCharacterId !== null && !isRelated) ||
              (selectedRelationId !== null && !isSelected);
            return (
              <RelationEdge
                key={r.id}
                relation={r}
                source={source}
                target={target}
                selected={isSelected}
                dimmed={dimmed}
                showLabel={true}
              />
            );
          })}

          {characters.map((c) => {
            const isFocused = c.id === focusedCharacterId;
            const isNeighbor = focusedNeighborIds.has(c.id);
            const dimmed = focusedCharacterId !== null && !isNeighbor;
            return (
              <CharacterNode
                key={c.id}
                character={c}
                selected={isFocused}
                highlighted={isNeighbor && !isFocused}
                dimmed={dimmed}
                connectingFrom={c.id === connectingFromId}
                showLabel={true}
              />
            );
          })}
        </g>
      </svg>

      {showHint && fromChar && (
        <div className="absolute top-[max(calc(env(safe-area-inset-top)+3.75rem),4.25rem)] right-3 z-30 animate-fade-up pointer-events-none max-w-[min(100%-1.5rem,20rem)]">
          <div className="bg-ink/90 text-paper-soft px-4 py-2 rounded-[2px] shadow-paper-lg backdrop-blur-sm flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full animate-breathe shrink-0"
              style={{ backgroundColor: fromChar.color }}
            />
            <span className="font-song text-sm min-w-0">
              自「{fromChar.name}」起 · 点另一位人物建立关系
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelConnect();
              }}
              className="pointer-events-auto ml-1 px-2 py-0.5 text-[11px] text-paper-soft/80 bg-transparent border border-paper-soft/20 rounded-[2px] hover:bg-paper-soft/10 shrink-0"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {relationGuideOpen && !connectingFromId && (
        <div className="absolute top-[max(calc(env(safe-area-inset-top)+3.75rem),4.25rem)] right-3 z-30 animate-fade-up pointer-events-none max-w-[min(100%-1.5rem,20rem)]">
          <div className="bg-ink/90 text-paper-soft px-4 py-2 rounded-[2px] shadow-paper-lg backdrop-blur-sm flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-gold animate-breathe shrink-0"
              aria-hidden="true"
            />
            <span className="font-song text-sm min-w-0">
              {characters.length < 2
                ? "至少两位人物才能建关系 · 请先新增"
                : "长按一位人物作为起点，再点另一位建立关系"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismissRelationGuide?.();
              }}
              className="pointer-events-auto ml-1 px-2 py-0.5 text-[11px] text-paper-soft/80 bg-transparent border border-paper-soft/20 rounded-[2px] hover:bg-paper-soft/10 shrink-0"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

