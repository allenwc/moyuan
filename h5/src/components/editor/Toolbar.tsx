import {
  IconArrowLeft,
  IconDownload,
  IconUndo,
  IconRedo,
} from "@/components/uiIcons";
import { goLibrary } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  title: string;
  subtitle: string;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onAutoLayout: () => void;
}

export function Toolbar({
  title,
  subtitle,
  saving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onAutoLayout,
}: EditorToolbarProps) {
  return (
    <div className="px-3 py-2.5 flex items-center gap-2 bg-paper-soft/95 backdrop-blur-md border-b border-ink/10">
      <button
        type="button"
        onClick={() => goLibrary()}
        className="btn-icon shrink-0"
        aria-label="返回图书馆"
      >
        <IconArrowLeft className="w-4 h-4" strokeWidth={1.6} />
      </button>

      <button
        type="button"
        className="flex-1 min-w-0 text-left bg-transparent rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        onClick={onAutoLayout}
        aria-label="自动排版"
      >
        <h1 className="font-song text-base text-ink leading-tight truncate">
          {title}
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={cn(
              "inline-block w-1.5 h-1.5 rounded-full",
              saving ? "bg-gold animate-breathe" : "bg-moss",
            )}
          />
          <span className="text-[11px] text-ink-mute tracking-editorial truncate">
            {saving ? "保存中…" : `已存 · ${subtitle}`}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="btn-icon shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="撤销"
      >
        <IconUndo className="w-4 h-4" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="btn-icon shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="重做"
      >
        <IconRedo className="w-4 h-4" strokeWidth={1.6} />
      </button>

      <button
        type="button"
        onClick={onExport}
        className="btn-primary text-xs px-3 h-10 shrink-0"
      >
        <IconDownload className="w-3.5 h-3.5 text-paper-soft" strokeWidth={1.8} />
        装裱
      </button>
    </div>
  );
}
