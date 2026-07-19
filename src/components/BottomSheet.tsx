import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "auto" | "full";
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "auto",
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // 弹窗从底部滑入时，把内容滚动位置重置到顶部，
    // 避免初始滚动停在底部导致顶部的 title 被顶出视口。
    const id = requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          "relative w-full max-w-[640px] bg-paper-soft border-t border-x border-ink/15 shadow-paper-lg animate-slide-up flex flex-col max-h-[92vh] rounded-t-[8px]",
          size === "full" && "h-[92vh]",
          className,
        )}
      >
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <span className="block w-10 h-1 rounded-full bg-ink/15" />
        </div>
        {(title || subtitle) && (
          <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="font-song text-xl text-ink leading-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-ink-mute tracking-editorial mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="btn-icon shrink-0"
              aria-label="关闭"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
        <div
          ref={contentRef}
          className="px-5 pb-2 overflow-y-auto flex-1 no-scrollbar"
        >
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-ink/10 safe-bottom shrink-0 flex items-center gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
