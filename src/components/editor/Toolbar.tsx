import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Undo2, Redo2, Sparkles, Library } from "lucide-react";
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
  const navigate = useNavigate();
  return (
    <header className="absolute top-0 left-0 right-0 z-30 safe-top">
      <div className="px-3 py-2.5 flex items-center gap-2 bg-paper-soft/85 backdrop-blur-md border-b border-ink/10">
        <button
          onClick={() => navigate("/")}
          className="btn-icon shrink-0"
          aria-label="返回图书馆"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.6} />
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onAutoLayout}
          title="点击自动排版"
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
        </div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="btn-icon shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="撤销"
        >
          <Undo2 className="w-4 h-4" strokeWidth={1.6} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="btn-icon shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="重做"
        >
          <Redo2 className="w-4 h-4" strokeWidth={1.6} />
        </button>

        <button
          onClick={onExport}
          className="btn-primary text-xs px-3 h-10 shrink-0"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
          装裱
        </button>
      </div>

      <div className="px-3 pb-1 pt-1.5 flex items-center gap-2 bg-paper-soft/85 backdrop-blur-md border-b border-ink/10">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 chip text-[10px] hover:bg-ink/5"
        >
          <Library className="w-3 h-3" strokeWidth={1.6} />
          图书馆
        </button>
        <button
          onClick={onAutoLayout}
          className="inline-flex items-center gap-1 chip text-[10px] hover:bg-ink/5"
        >
          <Sparkles className="w-3 h-3" strokeWidth={1.6} />
          排版
        </button>
        <span className="ml-auto text-[10px] text-ink-mute tracking-editorial">
          墨缘 · MOYUAN
        </span>
      </div>
    </header>
  );
}
