import { forwardRef, useMemo } from "react";
import type { Character, Relation } from "@/types";
import { getRelationMeta } from "@/lib/utils";
import { computeBounds } from "@/lib/layout";
import { getNodeRadius } from "@/lib/utils";
import { GenderShape, getGenderShape } from "@/lib/GenderShape";

interface ExportGraphProps {
  characters: Character[];
  relations: Relation[];
  title?: string;
  subtitle?: string;
  includeLabels: boolean;
  includeTitle: boolean;
  background: string;
}

export const ExportGraph = forwardRef<SVGSVGElement, ExportGraphProps>(
  function ExportGraph(
    { characters, relations, title, subtitle, includeLabels, includeTitle, background },
    ref,
  ) {
    const layout = useMemo(() => {
      const inner = computeBounds(characters, 80);
      const titleHeight = includeTitle && title ? 80 : 0;
      const bounds = {
        x: inner.x,
        y: inner.y - titleHeight,
        width: inner.width,
        height: inner.height + titleHeight,
      };
      return { ...bounds, titleHeight };
    }, [characters, includeTitle, title]);

    const isTransparent = background === "transparent";
    const actualBg = isTransparent
      ? "none"
      : background === "paper"
        ? "#f5efe2"
        : background === "ink"
          ? "#1f1b16"
          : background;

    const textColor = background === "ink" ? "#f5efe2" : "#1f1b16";
    const mutedColor = background === "ink" ? "rgba(245,239,226,0.55)" : "#6b6359";

    return (
      <svg
        ref={ref}
        viewBox={`${layout.x} ${layout.y} ${Math.max(layout.width, 360)} ${Math.max(layout.height, 280)}`}
        width={Math.max(layout.width, 360)}
        height={Math.max(layout.height, 280)}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          background: actualBg,
          fontFamily: '"Noto Serif SC", "Cormorant Garamond", serif',
        }}
      >
        <defs>
          {relations.map((r) => (
            <marker
              key={`m-${r.id}`}
              id={`arrow-${r.id}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill={getRelationMeta(r.type).stroke}
              />
            </marker>
          ))}
          <radialGradient id="export-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop
              offset="100%"
              stopColor={background === "ink" ? "rgba(0,0,0,0.35)" : "rgba(122,98,53,0.1)"}
            />
          </radialGradient>
          <filter id="export-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* decorative frame */}
        <rect
          x={layout.x + 12}
          y={layout.y + 12}
          width={Math.max(layout.width, 360) - 24}
          height={Math.max(layout.height, 280) - 24}
          fill="none"
          stroke={background === "ink" ? "rgba(245,239,226,0.2)" : "rgba(31,27,22,0.12)"}
          strokeWidth={0.8}
        />
        <rect
          x={layout.x + 18}
          y={layout.y + 18}
          width={Math.max(layout.width, 360) - 36}
          height={Math.max(layout.height, 280) - 36}
          fill="none"
          stroke={background === "ink" ? "rgba(245,239,226,0.1)" : "rgba(31,27,22,0.05)"}
          strokeWidth={0.5}
        />

        <rect
          x={layout.x}
          y={layout.y}
          width={Math.max(layout.width, 360)}
          height={Math.max(layout.height, 280)}
          fill="url(#export-vignette)"
        />

        {/* title watermark */}
        {includeTitle && title && (
          <g>
            <text
              x={layout.x + 36}
              y={layout.y + 44}
              fontFamily='"Noto Serif SC", serif'
              fontSize={26}
              fontWeight={700}
              fill={textColor}
            >
              {title}
            </text>
            {subtitle && (
              <text
                x={layout.x + 36}
                y={layout.y + 64}
                fontFamily='"Noto Sans SC", sans-serif'
                fontSize={12}
                fill={mutedColor}
                letterSpacing="0.1em"
              >
                {subtitle}
              </text>
            )}
            {/* seal */}
            <g transform={`translate(${layout.x + Math.max(layout.width, 360) - 64}, ${layout.y + 26})`}>
              <rect
                x={0}
                y={0}
                width={36}
                height={36}
                fill="#a8322d"
                rx={3}
              />
              <rect
                x={3}
                y={3}
                width={30}
                height={30}
                fill="none"
                stroke="rgba(245,239,226,0.4)"
                strokeWidth={0.8}
              />
              <text
                x={18}
                y={24}
                textAnchor="middle"
                fontFamily='"Noto Serif SC", serif'
                fontSize={14}
                fontWeight={700}
                fill="#faf6ec"
              >
                墨缘
              </text>
            </g>
            <line
              x1={layout.x + 36}
              y1={layout.y + 76}
              x2={layout.x + Math.max(layout.width, 360) - 36}
              y2={layout.y + 76}
              stroke={background === "ink" ? "rgba(245,239,226,0.2)" : "rgba(31,27,22,0.18)"}
              strokeWidth={0.6}
            />
          </g>
        )}

        {/* relations */}
        <g>
          {relations.map((r) => {
            const source = characters.find((c) => c.id === r.sourceId);
            const target = characters.find((c) => c.id === r.targetId);
            if (!source || !target) return null;
            const meta = getRelationMeta(r.type);
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.hypot(dx, dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;
            const sr = getNodeRadius(source.role);
            const tr = getNodeRadius(target.role);
            const sx = source.x + ux * sr;
            const sy = source.y + uy * sr;
            const ex = target.x - ux * (tr + 6);
            const ey = target.y - uy * (tr + 6);
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;
            return (
              <g key={`e-${r.id}`}>
                <line
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  stroke={meta.stroke}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${r.id})`}
                />
                {r.direction === "mutual" && (
                  <polygon
                    points={`${sx},${sy} ${sx - ux * 8 - uy * 4},${sy - uy * 8 + ux * 4} ${sx - ux * 8 + uy * 4},${sy - uy * 8 - ux * 4}`}
                    fill={meta.stroke}
                  />
                )}
                {includeLabels && (
                  <g transform={`translate(${mx}, ${my})`}>
                    <rect
                      x={-16}
                      y={-10}
                      width={32}
                      height={20}
                      rx={2}
                      fill={background === "ink" ? "#2a2520" : "#faf6ec"}
                      stroke={meta.stroke}
                      strokeWidth={0.8}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily='"Noto Serif SC", serif'
                      fontSize={11}
                      fontWeight={600}
                      fill={meta.stroke}
                    >
                      {meta.glyph}
                    </text>
                    {r.note && (
                      <text
                        y={18}
                        textAnchor="middle"
                        fontFamily='"Noto Sans SC", sans-serif'
                        fontSize={9}
                        fill={mutedColor}
                      >
                        {r.note.length > 8 ? r.note.slice(0, 8) + "…" : r.note}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* characters */}
        <g>
          {characters.map((c) => {
            const r = getNodeRadius(c.role);
            const glyphSize = Math.max(12, Math.round(r * 0.72));
            const shape = getGenderShape(c.gender);
            const textColorInner = (() => {
              const hex = c.color.replace("#", "");
              if (hex.length !== 6) return "#faf6ec";
              const r0 = parseInt(hex.slice(0, 2), 16);
              const g0 = parseInt(hex.slice(2, 4), 16);
              const b0 = parseInt(hex.slice(4, 6), 16);
              const luma = (0.299 * r0 + 0.587 * g0 + 0.114 * b0) / 255;
              return luma > 0.62 ? "#1f1b16" : "#faf6ec";
            })();
            return (
              <g key={`n-${c.id}`} transform={`translate(${c.x}, ${c.y})`} filter="url(#export-shadow)">
                <ellipse
                  cx={0}
                  cy={r + 5}
                  rx={r * 0.75}
                  ry={3}
                  fill="rgba(31,27,22,0.18)"
                />
                <GenderShape
                  shape={shape}
                  r={r}
                  fill={c.color}
                  stroke="rgba(245,239,226,0.55)"
                  strokeWidth={1.2}
                />
                <GenderShape
                  shape={shape}
                  r={r - 5}
                  fill="none"
                  stroke="rgba(245,239,226,0.3)"
                  strokeWidth={0.8}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily='"Noto Serif SC", serif'
                  fontSize={glyphSize}
                  fontWeight={700}
                  fill={textColorInner}
                >
                  {c.name.slice(0, 1)}
                </text>
                {c.alias && (
                  <g transform={`translate(${r - 2}, ${-r + 4})`}>
                    <circle r={6} fill="#a3824a" stroke="#faf6ec" strokeWidth={1} />
                    <text textAnchor="middle" dominantBaseline="central" fontFamily='"Noto Serif SC", serif' fontSize={7} fill="#faf6ec">别</text>
                  </g>
                )}
                {includeLabels && (
                  <g transform={`translate(0, ${r + 16})`}>
                    <text
                      textAnchor="middle"
                      fontFamily='"Noto Serif SC", serif'
                      fontSize={14}
                      fontWeight={600}
                      fill={textColor}
                    >
                      {c.name}
                    </text>
                    {c.faction && (
                      <text
                        y={16}
                        textAnchor="middle"
                        fontFamily='"Noto Sans SC", sans-serif'
                        fontSize={10}
                        fill={mutedColor}
                      >
                        {c.faction}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* footer credit */}
        {includeTitle && (
          <text
            x={layout.x + Math.max(layout.width, 360) - 36}
            y={layout.y + Math.max(layout.height, 280) - 16}
            textAnchor="end"
            fontFamily='"Cormorant Garamond", serif'
            fontSize={10}
            fill={mutedColor}
            letterSpacing="0.18em"
          >
            MOYUAN · 墨缘图谱
          </text>
        )}
      </svg>
    );
  },
);
