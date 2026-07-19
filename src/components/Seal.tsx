import { cn } from "@/lib/utils";

interface SealProps {
  text?: string;
  size?: number;
  rotate?: number;
  className?: string;
  tone?: "vermillion" | "gold" | "ink";
  square?: boolean;
}

const TONES: Record<NonNullable<SealProps["tone"]>, string> = {
  vermillion: "bg-vermillion text-paper-soft",
  gold: "bg-gold text-paper-soft",
  ink: "bg-ink text-paper-soft",
};

export function Seal({
  text = "墨缘",
  size = 56,
  rotate = -3,
  className,
  tone = "vermillion",
  square = true,
}: SealProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-song font-bold leading-none select-none",
        TONES[tone],
        square ? "rounded-[3px]" : "rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * (text.length > 2 ? 0.26 : 0.34),
        transform: `rotate(${rotate}deg)`,
        boxShadow:
          "0 0 0 1px rgba(168,50,45,0.18), 0 6px 18px -6px rgba(168,50,45,0.4), inset 0 0 0 2px rgba(245,239,226,0.18)",
        letterSpacing: "0.02em",
      }}
      aria-label={text}
    >
      <span className="flex flex-col items-center justify-center gap-[1px]">
        {text.split("").map((c, i) => (
          <span key={i} className="block">
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}

export function SealStamp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("pointer-events-none", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="sealGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#c4514a" />
          <stop offset="100%" stopColor="#7a2420" />
        </radialGradient>
        <filter id="sealRoughen">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
        </filter>
      </defs>
      <g filter="url(#sealRoughen)">
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          fill="url(#sealGrad)"
          stroke="#7a2420"
          strokeWidth="1.5"
        />
        <rect
          x="12"
          y="12"
          width="76"
          height="76"
          fill="none"
          stroke="rgba(245,239,226,0.35)"
          strokeWidth="1.2"
        />
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontFamily='"Noto Serif SC", serif'
          fontSize="34"
          fontWeight="700"
          fill="rgba(245,239,226,0.95)"
        >
          墨
        </text>
        <text
          x="50"
          y="86"
          textAnchor="middle"
          fontFamily='"Noto Serif SC", serif'
          fontSize="14"
          fill="rgba(245,239,226,0.7)"
          letterSpacing="2"
        >
          MOYUAN
        </text>
      </g>
    </svg>
  );
}
