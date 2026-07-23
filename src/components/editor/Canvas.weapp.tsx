import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas as TaroCanvas, View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import type { Character, Relation } from "@/types";
import { getGenderShape } from "@/lib/GenderShape";
import { getNodeRadius, getRelationMeta } from "@/lib/utils";
import { getScreenSize } from "@/lib/screen";
import type { CanvasProps } from "./canvasTypes";
import { EditorEmpty } from "./EditorEmpty";

const LONG_PRESS_MS = 480;
const TAP_TOL = 8;
const NODE_HIT_PAD = 6;

function labelColor(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#1f1b16";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#1f1b16" : "#faf6ec";
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ReturnType<typeof getGenderShape>,
  r: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (shape === "square") {
    const s = r * 2;
    const rr = r * 0.2;
    // rounded rect approx
    ctx.moveTo(-r + rr, -r);
    ctx.lineTo(r - rr, -r);
    ctx.quadraticCurveTo(r, -r, r, -r + rr);
    ctx.lineTo(r, r - rr);
    ctx.quadraticCurveTo(r, r, r - rr, r);
    ctx.lineTo(-r + rr, r);
    ctx.quadraticCurveTo(-r, r, -r, r - rr);
    ctx.lineTo(-r, -r + rr);
    ctx.quadraticCurveTo(-r, -r, -r + rr, -r);
    ctx.closePath();
  } else {
    // diamond
    const s = r * 1.4142;
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.rect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = fill;
    ctx.fill();
    if (strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function hitTest(
  characters: Character[],
  relations: Relation[],
  worldX: number,
  worldY: number,
): string {
  for (let i = characters.length - 1; i >= 0; i--) {
    const c = characters[i];
    const r = getNodeRadius(c.role) + NODE_HIT_PAD;
    if (Math.hypot(worldX - c.x, worldY - c.y) <= r) {
      return `node:${c.id}`;
    }
  }
  for (const rel of relations) {
    const source = characters.find((c) => c.id === rel.sourceId);
    const target = characters.find((c) => c.id === rel.targetId);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.max(
      0,
      Math.min(1, ((worldX - source.x) * dx + (worldY - source.y) * dy) / (len * len)),
    );
    const px = source.x + t * dx;
    const py = source.y + t * dy;
    if (Math.hypot(worldX - px, worldY - py) < 10) {
      return `edge:${rel.id}`;
    }
  }
  return "canvas";
}

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
  const canvasId = useRef(`moyuan-canvas-${Math.random().toString(36).slice(2, 8)}`).current;
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const sizeRef = useRef(getScreenSize());
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const charsRef = useRef(characters);
  charsRef.current = characters;
  const relsRef = useRef(relations);
  relsRef.current = relations;

  const dragIdRef = useRef<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const dragStartWorld = useRef<{ x: number; y: number } | null>(null);
  const positionChangedRef = useRef(false);
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number; target: string; t: number } | null>(null);
  const movedRef = useRef(false);

  const [ready, setReady] = useState(false);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const vp = viewportRef.current;
    return {
      x: (sx - vp.x) / vp.scale,
      y: (sy - vp.y) / vp.scale,
    };
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width: w, height: h } = sizeRef.current;
    const vp = viewportRef.current;
    const chars = charsRef.current;
    const rels = relsRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f5efe2";
    ctx.fillRect(0, 0, w, h);

    // grid
    const grid = 40 * vp.scale;
    const ox = vp.x % grid;
    const oy = vp.y % grid;
    ctx.fillStyle = "rgba(31,27,22,0.16)";
    for (let x = ox; x < w; x += grid) {
      for (let y = oy; y < h; y += grid) {
        ctx.beginPath();
        ctx.arc(x, y, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.scale, vp.scale);

    const focusedNeighbors = new Set<string>();
    if (focusedCharacterId) {
      focusedNeighbors.add(focusedCharacterId);
      for (const r of rels) {
        if (r.sourceId === focusedCharacterId) focusedNeighbors.add(r.targetId);
        if (r.targetId === focusedCharacterId) focusedNeighbors.add(r.sourceId);
      }
    }

    for (const r of rels) {
      const source = chars.find((c) => c.id === r.sourceId);
      const target = chars.find((c) => c.id === r.targetId);
      if (!source || !target) continue;
      const isSelected = r.id === selectedRelationId;
      const isRelated =
        focusedCharacterId !== null &&
        (r.sourceId === focusedCharacterId || r.targetId === focusedCharacterId);
      const dimmed =
        (focusedCharacterId !== null && !isRelated) ||
        (selectedRelationId !== null && !isSelected);
      const meta = getRelationMeta(r.type);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const sr = getNodeRadius(source.role);
      const tr = getNodeRadius(target.role);
      const x1 = source.x + ux * sr;
      const y1 = source.y + uy * sr;
      const x2 = target.x - ux * (tr + 4);
      const y2 = target.y - uy * (tr + 4);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = meta.stroke;
      ctx.lineWidth = isSelected ? 2 : 1.4;
      ctx.globalAlpha = dimmed ? 0.25 : isSelected ? 1 : 0.78;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (r.direction !== "mutual") {
        const ang = Math.atan2(uy, ux);
        const ax = x2;
        const ay = y2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - 8 * Math.cos(ang - 0.4),
          ay - 8 * Math.sin(ang - 0.4),
        );
        ctx.lineTo(
          ax - 8 * Math.cos(ang + 0.4),
          ay - 8 * Math.sin(ang + 0.4),
        );
        ctx.closePath();
        ctx.fillStyle = meta.stroke;
        ctx.globalAlpha = dimmed ? 0.25 : 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const label = meta.label || r.note;
      if (label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.font = "10px sans-serif";
        ctx.fillStyle = dimmed ? "rgba(31,27,22,0.35)" : "#6b6359";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, mx, my - 8);
      }
    }

    for (const c of chars) {
      const isFocused = c.id === focusedCharacterId;
      const isNeighbor = focusedNeighbors.has(c.id);
      const dimmed = focusedCharacterId !== null && !isNeighbor;
      const r = getNodeRadius(c.role);
      const shape = getGenderShape(c.gender);
      const textColor = labelColor(c.color);

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.globalAlpha = dimmed ? 0.32 : 1;

      if (isFocused) {
        drawShape(ctx, shape, r + 8, "transparent", "#a8322d", 1.2);
      }
      if (c.id === connectingFromId) {
        drawShape(ctx, shape, r + 14, "transparent", "#a8322d", 2);
      }

      // shadow
      ctx.beginPath();
      ctx.ellipse(0, r + 6, r * 0.8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(31,27,22,0.18)";
      ctx.fill();

      drawShape(ctx, shape, r, c.color, isFocused ? "#a8322d" : "rgba(31,27,22,0.25)", isFocused ? 2 : 1);

      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.max(12, Math.round(r * 0.72))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.name.slice(0, 1), 0, 1);

      ctx.fillStyle = "#1f1b16";
      ctx.font = "11px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(c.name, 0, r + 8);

      ctx.restore();
    }

    ctx.restore();
  }, [focusedCharacterId, selectedRelationId, connectingFromId]);

  // init type=2d canvas
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = Taro.createSelectorQuery();
      query
        .select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res?.[0]?.node as HTMLCanvasElement | undefined;
          if (!canvas) return;
          const width = res[0].width || getScreenSize().width;
          const height = res[0].height || getScreenSize().height;
          const dpr = Taro.getSystemInfoSync().pixelRatio || 1;
          dprRef.current = dpr;
          sizeRef.current = { width, height };
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
          ctxRef.current = ctx;
          setReady(true);
        });
    }, 50);
    return () => clearTimeout(timer);
  }, [canvasId]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, draw, characters, relations, viewport]);

  const handleTap = useCallback(
    (target: string) => {
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
        onSelectRelation(target.slice(5));
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

  const onTouchStart = (e: any) => {
    const touches = e.touches as Array<{ clientX: number; clientY: number; identifier: number }>;
    if (!touches?.length) return;
    clearLongPress();
    movedRef.current = false;

    if (touches.length >= 2) {
      dragIdRef.current = null;
      const a = touches[0];
      const b = touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      pinchStart.current = {
        dist,
        scale: viewportRef.current.scale,
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2,
      };
      panLast.current = null;
      return;
    }

    const t = touches[0];
    const world = screenToWorld(t.clientX, t.clientY);
    const target = hitTest(charsRef.current, relsRef.current, world.x, world.y);
    touchStart.current = { x: t.clientX, y: t.clientY, target, t: Date.now() };
    panLast.current = { x: t.clientX, y: t.clientY };

    if (target.startsWith("node:")) {
      const id = target.slice(5);
      const c = charsRef.current.find((cc) => cc.id === id);
      if (c) {
        dragOffset.current = { dx: world.x - c.x, dy: world.y - c.y };
        dragStartWorld.current = { x: c.x, y: c.y };
        dragIdRef.current = id;
        positionChangedRef.current = false;
      }
    } else {
      dragIdRef.current = null;
    }

    longPressTimer.current = setTimeout(() => {
      if (movedRef.current) return;
      const start = touchStart.current;
      if (!start) return;
      if (start.target.startsWith("node:")) {
        onStartConnect(start.target.slice(5));
      } else if (start.target === "canvas") {
        const w = screenToWorld(start.x, start.y);
        onAddCharacterAt(w.x, w.y);
      }
      touchStart.current = null;
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: any) => {
    const touches = e.touches as Array<{ clientX: number; clientY: number }>;
    if (!touches?.length) return;

    if (touches.length >= 2 && pinchStart.current) {
      clearLongPress();
      movedRef.current = true;
      const a = touches[0];
      const b = touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const factor = dist / (pinchStart.current.dist || 1);
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      onViewportChange((prev) => {
        const newScale = clampScale(pinchStart.current!.scale * factor);
        const k = newScale / prev.scale;
        return {
          scale: newScale,
          x: cx - (cx - prev.x) * k,
          y: cy - (cy - prev.y) * k,
        };
      });
      return;
    }

    const t = touches[0];
    const start = touchStart.current;
    if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > TAP_TOL) {
      movedRef.current = true;
      clearLongPress();
    }

    if (dragIdRef.current) {
      const world = screenToWorld(t.clientX, t.clientY);
      const nx = world.x - dragOffset.current.dx;
      const ny = world.y - dragOffset.current.dy;
      if (
        dragStartWorld.current &&
        Math.hypot(nx - dragStartWorld.current.x, ny - dragStartWorld.current.y) > 0.5
      ) {
        positionChangedRef.current = true;
      }
      onUpdatePosition(dragIdRef.current, nx, ny);
      return;
    }

    if (panLast.current) {
      const dx = t.clientX - panLast.current.x;
      const dy = t.clientY - panLast.current.y;
      panLast.current = { x: t.clientX, y: t.clientY };
      onViewportChange((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  };

  const onTouchEnd = () => {
    clearLongPress();
    const id = dragIdRef.current;
    if (id && positionChangedRef.current && dragStartWorld.current) {
      onCommitPosition(id, dragStartWorld.current.x, dragStartWorld.current.y);
    }
    dragIdRef.current = null;
    dragStartWorld.current = null;
    positionChangedRef.current = false;
    pinchStart.current = null;
    panLast.current = null;

    const start = touchStart.current;
    touchStart.current = null;
    if (start && !movedRef.current) {
      handleTap(start.target);
    }
  };

  const showHint = useMemo(() => connectingFromId !== null, [connectingFromId]);
  const fromChar = characters.find((c) => c.id === connectingFromId);
  const size = sizeRef.current;

  return (
    <View
      className="absolute inset-0 overflow-hidden canvas-area"
      style={{ background: "#f5efe2" }}
    >
      {characters.length === 0 && (
        <EditorEmpty
          onAdd={() => {
            const cx = (size.width / 2 - viewport.x) / viewport.scale;
            const cy = (size.height / 2 - viewport.y) / viewport.scale;
            onAddCharacterAt(cx, cy);
          }}
        />
      )}

      <TaroCanvas
        type="2d"
        id={canvasId}
        canvasId={canvasId}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      />

      {showHint && fromChar && (
        <View className="absolute top-20 right-3 z-30 max-w-[80%]">
          <View className="bg-ink/90 text-paper-soft px-4 py-2 rounded-[2px] flex items-center gap-2">
            <View
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: fromChar.color }}
            />
            <Text className="font-song text-sm">
              自「{fromChar.name}」起 · 点另一位人物建立关系
            </Text>
            <Text
              className="ml-1 px-2 py-0.5 text-[11px] border border-paper-soft/20 rounded-[2px]"
              onClick={() => onCancelConnect()}
            >
              取消
            </Text>
          </View>
        </View>
      )}

      {relationGuideOpen && !connectingFromId && (
        <View className="absolute top-20 right-3 z-30 max-w-[80%]">
          <View className="bg-ink/90 text-paper-soft px-4 py-2 rounded-[2px] flex items-center gap-2">
            <View className="w-2.5 h-2.5 rounded-full bg-gold shrink-0" />
            <Text className="font-song text-sm">
              {characters.length < 2
                ? "至少两位人物才能建关系 · 请先新增"
                : "长按一位人物作为起点，再点另一位建立关系"}
            </Text>
            <Text
              className="ml-1 px-2 py-0.5 text-[11px] border border-paper-soft/20 rounded-[2px]"
              onClick={() => onDismissRelationGuide?.()}
            >
              关闭
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
