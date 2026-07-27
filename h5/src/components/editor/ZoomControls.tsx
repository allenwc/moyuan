import {
  IconMinus,
  IconPlusCircle,
  IconLocate,
  IconLayoutGrid,
} from "@/components/uiIcons";

interface ZoomControlsProps {
  characterCount: number;
  relationCount: number;
  scalePercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
}

export function ZoomControls({
  characterCount,
  relationCount,
  scalePercent,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoLayout,
}: ZoomControlsProps) {
  const zoomBtnClass =
    "w-10 h-10 rounded-full bg-paper-soft border border-ink/15 shadow-paper flex items-center justify-center text-ink hover:bg-ink/5 active:scale-95 transition-[background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30";

  return (
    <div className="absolute left-4 z-20 pointer-events-auto bottom-[max(env(safe-area-inset-bottom),0.6rem)]">
      <div className="inline-flex flex-col items-stretch gap-2">
        <div className="flex items-center gap-2" role="group" aria-label="视图与排版">
          <button
            type="button"
            onClick={onZoomOut}
            className={zoomBtnClass}
            aria-label="缩小"
          >
            <IconMinus className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className={zoomBtnClass}
            aria-label="放大"
          >
            <IconPlusCircle className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onFitView}
            className={zoomBtnClass}
            aria-label="复位视图"
          >
            <IconLocate className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onAutoLayout}
            className={zoomBtnClass}
            aria-label="自动排版"
          >
            <IconLayoutGrid className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] text-ink-mute tracking-editorial bg-paper-soft/70 backdrop-blur-sm px-2.5 py-1 rounded-[2px] border border-ink/8 tabular-nums w-full box-border">
          <span>{characterCount} 人</span>
          <span className="divider-dot" />
          <span>{relationCount} 缘</span>
          <span className="divider-dot" />
          <span>{scalePercent}%</span>
        </div>
      </div>
    </div>
  );
}
