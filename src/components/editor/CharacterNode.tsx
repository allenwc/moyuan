import { memo } from "react";
import type { Character } from "@/types";

export const NODE_RADIUS = 28;

interface CharacterNodeProps {
  character: Character;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  connectingFrom: boolean;
  showLabel: boolean;
}

function getLabelColor(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#1f1b16";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#1f1b16" : "#faf6ec";
}

function CharacterNodeImpl({
  character,
  selected,
  highlighted,
  dimmed,
  connectingFrom,
  showLabel,
}: CharacterNodeProps) {
  const label = character.color;
  const textColor = getLabelColor(label);
  const firstChar = character.name.slice(0, 1);
  const opacity = dimmed ? 0.32 : 1;

  return (
    <g
      data-target={`node:${character.id}`}
      transform={`translate(${character.x}, ${character.y})`}
      style={{ opacity, transition: "opacity 0.2s" }}
      className="cursor-pointer"
    >
      {/* halo for selected */}
      {selected && (
        <circle
          r={NODE_RADIUS + 8}
          fill="none"
          stroke="#a8322d"
          strokeWidth={1.2}
          opacity={0.5}
          strokeDasharray="2 3"
          className="animate-breathe"
        />
      )}
      {/* drop shadow */}
      <ellipse
        cx={0}
        cy={NODE_RADIUS + 6}
        rx={NODE_RADIUS * 0.8}
        ry={4}
        fill="rgba(31,27,22,0.18)"
        filter="blur(2px)"
      />
      {/* connecting-from pulse */}
      {connectingFrom && (
        <circle
          r={NODE_RADIUS + 14}
          fill="none"
          stroke="#a8322d"
          strokeWidth={2}
          opacity={0.4}
          className="animate-breathe"
        />
      )}
      {/* highlighted ring */}
      {highlighted && (
        <circle
          r={NODE_RADIUS + 4}
          fill="none"
          stroke="#a3824a"
          strokeWidth={1.4}
          opacity={0.7}
        />
      )}
      {/* main body */}
      <circle
        r={NODE_RADIUS}
        fill={label}
        stroke={selected ? "#1f1b16" : "rgba(245,239,226,0.45)"}
        strokeWidth={selected ? 1.5 : 1.2}
      />
      {/* inner ring */}
      <circle
        r={NODE_RADIUS - 5}
        fill="none"
        stroke="rgba(245,239,226,0.32)"
        strokeWidth={0.8}
      />
      {/* glyph */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily='"Noto Serif SC", serif'
        fontSize={20}
        fontWeight={700}
        fill={textColor}
        style={{ pointerEvents: "none" }}
      >
        {firstChar}
      </text>
      {/* alias small marker */}
      {character.alias && (
        <g transform={`translate(${NODE_RADIUS - 2}, ${-NODE_RADIUS + 4})`}>
          <circle r={6} fill="#a3824a" stroke="#faf6ec" strokeWidth={1} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily='"Noto Serif SC", serif'
            fontSize={7}
            fill="#faf6ec"
            style={{ pointerEvents: "none" }}
          >
            别
          </text>
        </g>
      )}
      {showLabel && (
        <g transform={`translate(0, ${NODE_RADIUS + 14})`} style={{ pointerEvents: "none" }}>
          <text
            textAnchor="middle"
            fontFamily='"Noto Serif SC", serif'
            fontSize={14}
            fontWeight={600}
            fill="#1f1b16"
            style={{ pointerEvents: "none" }}
          >
            {character.name}
          </text>
          {character.faction && (
            <text
              y={16}
              textAnchor="middle"
              fontFamily='"Noto Sans SC", sans-serif'
              fontSize={10}
              fill="#6b6359"
              style={{ pointerEvents: "none" }}
            >
              {character.faction}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export const CharacterNode = memo(CharacterNodeImpl);
