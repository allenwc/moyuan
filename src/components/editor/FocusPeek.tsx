import type { Character } from "@/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface FocusPeekProps {
  character: Character;
  relationCount: number;
  onEdit: () => void;
  onDismiss: () => void;
  className?: string;
}

export function FocusPeek({
  character,
  relationCount,
  onEdit,
  onDismiss,
  className,
}: FocusPeekProps) {
  const subtitle = [
    character.role || null,
    character.faction || null,
    `${relationCount} 缘`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn("px-3 pt-2 pointer-events-none", className)}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto animate-peek-down",
          "rounded-[4px] border border-ink/12 bg-paper-soft/95 backdrop-blur-md shadow-paper-lg",
          "pl-3 pr-2 py-2.5 flex items-center gap-2.5 max-w-full",
        )}
      >
        <span
          className="shrink-0 w-8 h-8 rounded-full border border-ink/15 animate-scale-in"
          style={{ backgroundColor: character.color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="font-song text-[15px] text-ink leading-tight truncate">
            {character.name}
          </p>
          <p className="text-[11px] text-ink-mute tracking-editorial mt-0.5 truncate">
            {subtitle || "暂无关系"}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="btn-primary shrink-0 px-2.5 py-1.5 text-xs"
        >
          编辑人物
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="btn-icon shrink-0"
          aria-label="取消焦点"
        >
          <X className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
