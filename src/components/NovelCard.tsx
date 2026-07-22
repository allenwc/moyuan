import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Character, Novel, Relation } from "@/types";
import { cn, formatTime, getThemePalette } from "@/lib/utils";
import { MoreHorizontal, Users, GitBranch } from "lucide-react";

interface NovelCardProps {
  novel: Novel;
  characters: Character[];
  relations: Relation[];
  onMore: (e: React.MouseEvent, novel: Novel) => void;
  index?: number;
}

export function NovelCard({
  novel,
  characters,
  relations,
  onMore,
  index = 0,
}: NovelCardProps) {
  const navigate = useNavigate();
  const palette = getThemePalette(novel.themeColor);
  const [pressed, setPressed] = useState(false);

  return (
    <article
      className={cn(
        "paper-card group cursor-pointer flex overflow-hidden animate-fade-up",
        pressed && "translate-y-[-2px] shadow-paper-lg",
      )}
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
      onClick={() => navigate(`/editor/${novel.id}`)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Book spine / cover */}
      <div
        className="relative w-20 sm:w-24 shrink-0 flex flex-col items-center py-4 overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${palette.primary} 0%, ${palette.deep} 100%)`,
          color: palette.text,
        }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative w-full text-center px-1">
          <span className="text-[10px] tracking-seal opacity-70 uppercase font-display">
            Vol.
          </span>
          <span className="block font-display text-lg italic opacity-90">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="relative flex-1 flex flex-col items-center justify-center">
          <span
            className="font-song font-bold text-base leading-tight text-center px-1"
            style={{ letterSpacing: "0.08em" }}
          >
            {novel.title.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 p-4 pl-5 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-song text-lg text-ink leading-tight line-clamp-2">
            {novel.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMore(e, novel);
            }}
            className="btn-icon -mr-1 -mt-1 shrink-0"
            aria-label="更多操作"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
        <p className="text-xs text-ink-mute mt-0.5 clamp-1">
          {novel.author || "佚名"}
        </p>
        {novel.synopsis && (
          <p className="text-[13px] text-ink-soft mt-2 leading-relaxed clamp-2">
            {novel.synopsis}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-ink-mute">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" strokeWidth={1.6} />
              {characters.length} 人
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="w-3 h-3" strokeWidth={1.6} />
              {relations.length} 缘
            </span>
          </div>
          <span className="tracking-editorial">{formatTime(novel.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
