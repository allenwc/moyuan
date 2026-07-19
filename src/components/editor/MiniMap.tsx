import { useMemo } from "react";
import type { Character, Viewport } from "@/types";
import { computeBounds } from "@/lib/layout";
import { NODE_RADIUS } from "./CharacterNode";

interface MiniMapProps {
  characters: Character[];
  viewport: Viewport;
  canvasWidth: number;
  canvasHeight: number;
  onJump: (worldX: number, worldY: number) => void;
}

export function MiniMap({
  characters,
  viewport,
  canvasWidth,
  canvasHeight,
  onJump,
}: MiniMapProps) {
  const MAP_W = 110;
  const MAP_H = 90;
  const PADDING = 60;

  const view = useMemo(() => {
    if (characters.length === 0) {
      return {
        bounds: { x: -200, y: -150, width: 400, height: 300 },
        sx: 1,
        sy: 1,
      };
    }
    const bounds = computeBounds(characters, PADDING);
    const sx = MAP_W / Math.max(bounds.width, 1);
    const sy = MAP_H / Math.max(bounds.height, 1);
    return { bounds, sx: Math.min(sx, sy), sy: Math.min(sx, sy) };
  }, [characters]);

  if (characters.length === 0) return null;

  const { bounds, sx, sy } = view;
  const worldToMap = (x: number, y: number) => ({
    x: (x - bounds.x) * sx,
    y: (y - bounds.y) * sy,
  });

  // viewport rect in world coords: top-left = -viewport.x/scale, width = canvasWidth/scale
  const vwWorld = canvasWidth / viewport.scale;
  const vhWorld = canvasHeight / viewport.scale;
  const vxWorld = -viewport.x / viewport.scale;
  const vyWorld = -viewport.y / viewport.scale;
  const vp1 = worldToMap(vxWorld, vyWorld);
  const vp2 = worldToMap(vxWorld + vwWorld, vyWorld + vhWorld);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const worldX = px / sx + bounds.x;
    const worldY = py / sy + bounds.y;
    onJump(worldX, worldY);
  };

  return (
    <div className="absolute top-[88px] right-3 z-20 pointer-events-auto">
      <div className="paper-card p-1.5 rounded-[3px] shadow-paper-lg bg-paper-soft/95 backdrop-blur-sm">
        <svg
          width={MAP_W}
          height={MAP_H}
          onClick={handleClick}
          className="block cursor-pointer"
          style={{ background: "rgba(31,27,22,0.04)" }}
        >
          <rect
            x={0}
            y={0}
            width={MAP_W}
            height={MAP_H}
            fill="none"
            stroke="rgba(31,27,22,0.1)"
            strokeWidth={0.5}
          />
          {characters.map((c) => {
            const p = worldToMap(c.x, c.y);
            return (
              <circle
                key={c.id}
                cx={p.x}
                cy={p.y}
                r={Math.max(1.4, NODE_RADIUS * sx * 0.4)}
                fill={c.color}
                opacity={0.85}
              />
            );
          })}
          {/* viewport indicator */}
          <rect
            x={Math.max(0, vp1.x)}
            y={Math.max(0, vp1.y)}
            width={Math.max(2, Math.min(MAP_W, vp2.x) - Math.max(0, vp1.x))}
            height={Math.max(2, Math.min(MAP_H, vp2.y) - Math.max(0, vp1.y))}
            fill="rgba(168,50,45,0.12)"
            stroke="#a8322d"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        </svg>
        <p className="text-[9px] text-ink-mute mt-1 text-center tracking-editorial">
          鸟瞰 · 点击跳转
        </p>
      </div>
    </div>
  );
}
