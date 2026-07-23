import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

const isH5 = process.env.TARO_ENV === "h5";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open || !isH5) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const node = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[360px] bg-paper-soft border border-ink/15 rounded-[4px] shadow-paper-lg animate-scale-in overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          {title && (
            <h3 className="font-song text-lg text-ink leading-snug">{title}</h3>
          )}
          {description && (
            <p className="mt-2 text-sm text-ink-mute leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex border-t border-ink/10">
          <button
            onClick={onCancel}
            className="flex-1 h-12 text-sm text-ink-mute hover:bg-ink/5 transition-colors tracking-editorial"
          >
            {cancelText}
          </button>
          <span className="w-px bg-ink/10" />
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 h-12 text-sm font-medium transition-colors tracking-editorial",
              tone === "danger"
                ? "text-vermillion hover:bg-vermillion/8"
                : "text-ink hover:bg-ink/5",
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (isH5 && typeof document !== "undefined") {
    return createPortal(node, document.body);
  }
  return node;
}
