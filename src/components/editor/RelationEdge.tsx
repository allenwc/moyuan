import { memo } from "react";
import type { Character, Relation } from "@/types";
import { getRelationMeta } from "@/lib/utils";
import { getNodeRadius } from "@/lib/utils";

interface RelationEdgeProps {
  relation: Relation;
  source: Character;
  target: Character;
  selected: boolean;
  dimmed: boolean;
  showLabel: boolean;
}

function RelationEdgeImpl({
  relation,
  source,
  target,
  selected,
  dimmed,
  showLabel,
}: RelationEdgeProps) {
  const meta = getRelationMeta(relation.type);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const sr = getNodeRadius(source.role);
  const tr = getNodeRadius(target.role);
  const start = {
    x: source.x + ux * sr,
    y: source.y + uy * sr,
  };
  const end = {
    x: target.x - ux * (tr + 4),
    y: target.y - uy * (tr + 4),
  };

  const curveOffset = 0;
  const mx = (start.x + end.x) / 2 + -uy * curveOffset;
  const my = (start.y + end.y) / 2 + ux * curveOffset;

  const opacity = dimmed ? 0.25 : selected ? 1 : 0.78;
  const stroke = meta.stroke;
  const strokeW = selected ? 2 : 1.4;
  const isMutual = relation.direction === "mutual";

  return (
    <g
      data-target={`edge:${relation.id}`}
      style={{ opacity, transition: "opacity 0.2s", cursor: "pointer" }}
    >
      {/* invisible hit area for tap */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="transparent"
        strokeWidth={20}
        data-target={`edge:${relation.id}`}
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* arrow head (target end) */}
      <Arrow x={end.x} y={end.y} angle={Math.atan2(uy, ux)} color={stroke} size={7} />
      {/* reverse arrow for mutual */}
      {isMutual && (
        <Arrow
          x={start.x}
          y={start.y}
          angle={Math.atan2(-uy, -ux)}
          color={stroke}
          size={7}
        />
      )}
      {showLabel && (
        <g transform={`translate(${mx}, ${my})`} style={{ pointerEvents: "none" }}>
          <rect
            x={-18}
            y={-10}
            width={36}
            height={20}
            rx={2}
            fill="#faf6ec"
            stroke={stroke}
            strokeWidth={0.8}
            opacity={0.96}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily='"Noto Serif SC", serif'
            fontSize={11}
            fontWeight={600}
            fill={stroke}
            style={{ pointerEvents: "none" }}
          >
            {meta.glyph}
          </text>
          {relation.note && (
            <g transform="translate(0, 18)">
              <text
                textAnchor="middle"
                fontFamily='"Noto Sans SC", sans-serif'
                fontSize={9}
                fill="#6b6359"
                style={{ pointerEvents: "none" }}
              >
                {relation.note.length > 8
                  ? relation.note.slice(0, 8) + "…"
                  : relation.note}
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
}

function Arrow({
  x,
  y,
  angle,
  color,
  size,
}: {
  x: number;
  y: number;
  angle: number;
  color: string;
  size: number;
}) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const x1 = x - cos * size - sin * size * 0.5;
  const y1 = y - sin * size + cos * size * 0.5;
  const x2 = x - cos * size + sin * size * 0.5;
  const y2 = y - sin * size - cos * size * 0.5;
  return (
    <polygon
      points={`${x},${y} ${x1},${y1} ${x2},${y2}`}
      fill={color}
      style={{ pointerEvents: "none" }}
    />
  );
}

export const RelationEdge = memo(RelationEdgeImpl);
