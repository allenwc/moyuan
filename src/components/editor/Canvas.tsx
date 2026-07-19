import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Character, Relation, Viewport } from "@/types";
import { useCanvasGestures } from "@/hooks/useGestures";
import { CharacterNode } from "./CharacterNode";
import { RelationEdge } from "./RelationEdge";
import { EditorEmpty } from "./EditorEmpty";

interface CanvasProps {
  characters: Character[];
  relations: Relation[];
  viewport: Viewport;
  selectedCharacterId: string | null;
  selectedRelationId: string | null;
  connectingFromId: string | null;
  onViewportChange: (vp: Viewport) => void;
  onSelectCharacter: (id: string | null) => void;
  onSelectRelation: (id: string | null) => void;
  onStartConnect: (id: string) => void;
  onCompleteConnect: (sourceId: string, targetId: string) => void;
  onCancelConnect: () => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onCommitPosition: (id: string, x: number, y: number) => void;
  onAddCharacterAt: (x: number, y: number) => void;
  clampScale: (s: number) => number;
}

export function Canvas({
  characters,
  relations,
  viewport,
  selectedCharacterId,
  selectedRelationId,
  connectingFromId,
  onViewportChange,
  onSelectCharacter,
  onSelectRelation,
  onStartConnect,
  onCompleteConnect,
  onCancelConnect,
  onUpdatePosition,
  onCommitPosition,
  onAddCharacterAt,
  clampScale,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragStartWorld = useRef<{ x: number; y: number } | null>(null);
  const positionChangedRef = useRef(false);

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

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const x = clientX - left;
      const y = clientY - top;
      return {
        x: (x - viewport.x) / viewport.scale,
        y: (y - viewport.y) / viewport.scale,
      };
    },
    [viewport],
  );

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      onViewportChange({
        ...viewport,
        x: viewport.x + dx,
        y: viewport.y + dy,
      });
    },
    [viewport, onViewportChange],
  );

  const handleZoom = useCallback(
    (factor: number, cx: number, cy: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const px = cx - left;
      const py = cy - top;
      const newScale = clampScale(viewport.scale * factor);
      const k = newScale / viewport.scale;
      const nx = px - (px - viewport.x) * k;
      const ny = py - (py - viewport.y) * k;
      onViewportChange({ scale: newScale, x: nx, y: ny });
    },
    [viewport, onViewportChange, clampScale],
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
      setDragId(id);
      positionChangedRef.current = false;
      return true;
    },
    [characters, screenToWorld],
  );

  const handleNodeDrag = useCallback(
    (_pointerId: number, x: number, y: number) => {
      if (!dragId) return;
      const world = screenToWorld(x, y);
      const nx = world.x - dragOffset.current.dx;
      const ny = world.y - dragOffset.current.dy;
      if (
        dragStartWorld.current &&
        Math.hypot(nx - dragStartWorld.current.x, ny - dragStartWorld.current.y) > 0.5
      ) {
        positionChangedRef.current = true;
      }
      onUpdatePosition(dragId, nx, ny);
    },
    [dragId, onUpdatePosition, screenToWorld],
  );

  const handleEndNodeDrag = useCallback(() => {
    if (dragId && positionChangedRef.current && dragStartWorld.current) {
      onCommitPosition(dragId, dragStartWorld.current.x, dragStartWorld.current.y);
    }
    setDragId(null);
    dragStartWorld.current = null;
    positionChangedRef.current = false;
  }, [dragId, onCommitPosition]);

  const handleTap = useCallback(
    (_x: number, _y: number, target: string) => {
      if (target === "canvas" || target === "") {
        if (connectingFromId) {
          onCancelConnect();
          return;
        }
        onSelectCharacter(null);
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
        onSelectCharacter(id);
        return;
      }
      if (target.startsWith("edge:")) {
        const id = target.slice(5);
        onSelectRelation(id);
      }
    },
    [
      connectingFromId,
      onCancelConnect,
      onCompleteConnect,
      onSelectCharacter,
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

  // dim/highlight when one is selected
  const selectedRelIds = useMemo(() => {
    if (!selectedCharacterId) return new Set<string>();
    return new Set(
      relations
        .filter(
          (r) => r.sourceId === selectedCharacterId || r.targetId === selectedCharacterId,
        )
        .map((r) => r.id),
    );
  }, [relations, selectedCharacterId]);

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
              selectedCharacterId !== null &&
              (r.sourceId === selectedCharacterId ||
                r.targetId === selectedCharacterId);
            const dimmed =
              (selectedCharacterId !== null && !isRelated) ||
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
            const isSelected = c.id === selectedCharacterId;
            const isRelated =
              selectedRelIds.has(c.id) || c.id === selectedCharacterId;
            const dimmed = selectedCharacterId !== null && !isRelated;
            return (
              <CharacterNode
                key={c.id}
                character={c}
                selected={isSelected}
                highlighted={false}
                dimmed={dimmed}
                connectingFrom={c.id === connectingFromId}
                showLabel={true}
              />
            );
          })}
        </g>
      </svg>

      {showHint && fromChar && (
        <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-30 animate-fade-up pointer-events-none">
          <div className="bg-ink/90 text-paper-soft px-4 py-2 rounded-[2px] shadow-paper-lg backdrop-blur-sm flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full animate-breathe"
              style={{ backgroundColor: fromChar.color }}
            />
            <span className="font-song text-sm">
              自「{fromChar.name}」起 · 点另一位人物建立关系
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelConnect();
              }}
              className="pointer-events-auto ml-1 px-2 py-0.5 text-[11px] text-paper-soft/80 border border-paper-soft/20 rounded-[2px] hover:bg-paper-soft/10"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

