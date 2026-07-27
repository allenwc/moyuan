import { useEffect, useRef, useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import type { Character, Novel, Relation, ExportOptions } from "@/types";
import { DEFAULT_EXPORT_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";
import { ExportGraph } from "./ExportGraph";

interface ExportStudioProps {
  open: boolean;
  novel: Novel | null;
  characters: Character[];
  relations: Relation[];
  onClose: () => void;
}

const BG_OPTIONS: { key: ExportOptions["background"]; label: string; swatch: string }[] = [
  { key: "paper", label: "纸色", swatch: "#f5efe2" },
  { key: "ink", label: "墨黑", swatch: "#1f1b16" },
  { key: "transparent", label: "透明", swatch: "transparent" },
];

export function ExportStudio({
  open,
  novel,
  characters,
  relations,
  onClose,
}: ExportStudioProps) {
  const [opts, setOpts] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customColor, setCustomColor] = useState("#3a4a5a");
  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setToast(null);
  }, [open]);

  const bg = opts.background === "custom" ? customColor : opts.background;
  const subtitle = novel?.author ? `${novel.author}` : "墨缘图谱";

  const download = async () => {
    if (!svgRef.current || !novel) return;
    setBusy(true);
    setToast(null);
    try {
      const filename = `墨缘-${novel.title}-${Date.now()}`;
      if (opts.format === "svg") {
        const xml = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
        triggerDownload(URL.createObjectURL(blob), `${filename}.svg`);
      } else if (opts.format === "png" || opts.format === "jpg") {
        const node = svgRef.current;
        const backgroundColor =
          opts.background === "transparent"
            ? undefined
            : opts.background === "paper"
              ? "#f5efe2"
              : opts.background === "ink"
                ? "#1f1b16"
                : customColor;
        const fn = opts.format === "png" ? toPng : toJpeg;
        const dataUrl = await fn(node as unknown as HTMLElement, {
          pixelRatio: opts.scale,
          backgroundColor,
          cacheBust: true,
        });
        triggerDownload(dataUrl, `${filename}.${opts.format}`);
      }
      setToast("已装裱并下载。");
    } catch (err) {
      console.error(err);
      setToast("导出失败，请重试。");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!svgRef.current || !novel) return;
    setBusy(true);
    setToast(null);
    try {
      const dataUrl = await toPng(svgRef.current as unknown as HTMLElement, {
        pixelRatio: opts.scale,
        backgroundColor:
          opts.background === "transparent"
            ? undefined
            : opts.background === "paper"
              ? "#f5efe2"
              : opts.background === "ink"
                ? "#1f1b16"
                : customColor,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${novel.title}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { share?: (data: { files: File[]; title?: string }) => Promise<void> };
      const navCanShare = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.share && (!navCanShare.canShare || navCanShare.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: novel.title });
        setToast("分享完成。");
      } else {
        // fallback: copy to clipboard
        if (navigator.clipboard && (navigator.clipboard as Clipboard & { write?: (items: ClipboardItem[]) => Promise<void> }).write) {
          const item = new ClipboardItem({ "image/png": blob });
          await (navigator.clipboard as Clipboard & { write: (items: ClipboardItem[]) => Promise<void> }).write([item]);
          setToast("已复制到剪贴板。");
        } else {
          triggerDownload(dataUrl, `${novel.title}.png`);
          setToast("浏览器不支持分享，已下载。");
        }
      }
    } catch (err) {
      console.error(err);
      setToast("分享失败。");
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async () => {
    if (!svgRef.current || !novel) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(svgRef.current as unknown as HTMLElement, {
        pixelRatio: opts.scale,
        backgroundColor:
          opts.background === "transparent"
            ? undefined
            : opts.background === "paper"
              ? "#f5efe2"
              : opts.background === "ink"
                ? "#1f1b16"
                : customColor,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      if (navigator.clipboard && (navigator.clipboard as Clipboard & { write?: (items: ClipboardItem[]) => Promise<void> }).write) {
        const item = new ClipboardItem({ "image/png": blob });
        await (navigator.clipboard as Clipboard & { write: (items: ClipboardItem[]) => Promise<void> }).write([item]);
        setCopied(true);
        setToast("已复制到剪贴板。");
        setTimeout(() => setCopied(false), 1800);
      } else {
        setToast("当前浏览器不支持剪贴板写入。");
      }
    } catch (err) {
      console.error(err);
      setToast("复制失败。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="seal w-6 h-6 text-[10px]">裱</span>
          装裱·导出
        </span>
      }
      subtitle="将此卷人物关系图谱装裱成可分享的图"
      size="full"
      footer={
        <>
          <button onClick={copyToClipboard} disabled={busy} className="btn-ghost flex-1 disabled:opacity-50">
            {copied ? <span>✓</span> : <span>贴</span>}
            {copied ? "已复制" : "复制"}
          </button>
          <button onClick={share} disabled={busy} className="btn-ghost flex-1 disabled:opacity-50">
            <span>↗</span>
            分享
          </button>
          <button onClick={download} disabled={busy} className="btn-primary flex-[2] disabled:opacity-60">
            <span>↓</span>
            {busy ? "装裱中…" : "下载"}
          </button>
        </>
      }
    >
      <div className="pt-2 pb-3 space-y-5">
        {/* Preview */}
        <div
          ref={previewWrapRef}
          className="relative bg-paper-deep/40 border border-ink/10 rounded-[3px] p-4 flex items-center justify-center"
          style={{
            backgroundImage:
              opts.background === "transparent"
                ? "linear-gradient(45deg, rgba(31,27,22,0.08) 25%, transparent 25%, transparent 75%, rgba(31,27,22,0.08) 75%), linear-gradient(45deg, rgba(31,27,22,0.08) 25%, transparent 25%, transparent 75%, rgba(31,27,22,0.08) 75%)"
                : undefined,
            backgroundSize: opts.background === "transparent" ? "12px 12px" : undefined,
            backgroundPosition: opts.background === "transparent" ? "0 0, 6px 6px" : undefined,
          }}
        >
          <div
            className="w-full max-w-[300px] max-h-[260px] overflow-hidden flex items-center justify-center"
            style={{
              boxShadow:
                opts.background === "transparent"
                  ? undefined
                  : "0 6px 22px -10px rgba(31,27,22,0.4)",
            }}
          >
            {characters.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-song text-ink-mute">尚无人物可装裱</p>
                <p className="text-xs text-ink-mute mt-1">先添加人物后再来导出。</p>
              </div>
            ) : (
              <ExportGraph
                ref={svgRef}
                characters={characters}
                relations={relations}
                title={novel?.title}
                subtitle={subtitle}
                includeLabels={opts.includeLabels}
                includeTitle={opts.includeTitle}
                background={bg}
              />
            )}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            格式 · FORMAT
          </label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <FormatCard
              active={opts.format === "png"}
              onClick={() => setOpts((o) => ({ ...o, format: "png" }))}
              icon={<span>图</span>}
              label="PNG"
              hint="透明支持"
            />
            <FormatCard
              active={opts.format === "jpg"}
              onClick={() => setOpts((o) => ({ ...o, format: "jpg" }))}
              icon={<span>图</span>}
              label="JPG"
              hint="体量更小"
            />
            <FormatCard
              active={opts.format === "svg"}
              onClick={() => setOpts((o) => ({ ...o, format: "svg" }))}
              icon={<span>文</span>}
              label="SVG"
              hint="矢量无损"
            />
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            分辨率 · SCALE
          </label>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOpts((o) => ({ ...o, scale: s as 1 | 2 | 3 }))}
                className={cn(
                  "flex-1 h-10 rounded-[2px] border text-sm transition-all",
                  opts.scale === s
                    ? "border-ink bg-paper-soft shadow-paper"
                    : "bg-transparent border-ink/10 hover:bg-ink/5",
                )}
              >
                <span className="font-display text-base">{s}</span>
                <span className="text-xs text-ink-mute ml-1">×</span>
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            底色 · BACKGROUND
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {BG_OPTIONS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setOpts((o) => ({ ...o, background: b.key }))}
                className={cn(
                  "flex items-center gap-2 px-3 h-9 rounded-[2px] border text-xs transition-all",
                  opts.background === b.key
                    ? "border-ink bg-paper-soft shadow-paper"
                    : "bg-transparent border-ink/10 hover:bg-ink/5",
                )}
              >
                <span
                  className="w-4 h-4 rounded-full border border-ink/15"
                  style={{
                    backgroundColor: b.swatch,
                    backgroundImage:
                      b.swatch === "transparent"
                        ? "linear-gradient(45deg, rgba(31,27,22,0.18) 25%, transparent 25%, transparent 75%, rgba(31,27,22,0.18) 75%)"
                        : undefined,
                    backgroundSize: b.swatch === "transparent" ? "4px 4px" : undefined,
                  }}
                />
                {b.label}
              </button>
            ))}
            <label
              className={cn(
                "flex items-center gap-2 px-3 h-9 rounded-[2px] border text-xs transition-all cursor-pointer",
                opts.background === "custom"
                  ? "border-ink bg-paper-soft shadow-paper"
                  : "bg-transparent border-ink/10 hover:bg-ink/5",
              )}
            >
              <span
                className="w-4 h-4 rounded-full border border-ink/15"
                style={{ backgroundColor: customColor }}
              />
              自定
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setOpts((o) => ({ ...o, background: "custom" }));
                }}
                className="w-0 h-0 opacity-0"
              />
            </label>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <Toggle
            checked={opts.includeLabels}
            onChange={(v) => setOpts((o) => ({ ...o, includeLabels: v }))}
            label="显示名讳"
          />
          <Toggle
            checked={opts.includeTitle}
            onChange={(v) => setOpts((o) => ({ ...o, includeTitle: v }))}
            label="装裱题款"
          />
        </div>

        {toast && (
          <p className="text-sm text-moss text-center py-1 animate-fade-in">
            {toast}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

function FormatCard({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 py-3 rounded-[2px] border transition-all",
        active
          ? "border-ink bg-paper-soft shadow-paper"
          : "bg-transparent border-ink/10 hover:bg-ink/5",
      )}
    >
      <span className={active ? "text-vermillion" : "text-ink"}>{icon}</span>
      <span className="font-display text-base font-semibold text-ink">{label}</span>
      <span className="text-[10px] text-ink-mute">{hint}</span>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 px-3 h-10 rounded-[2px] border transition-all flex-1",
        checked
          ? "border-ink bg-paper-soft shadow-paper"
          : "bg-transparent border-ink/10 hover:bg-ink/5",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center w-8 h-5 rounded-full transition-colors relative",
          checked ? "bg-vermillion" : "bg-ink/15",
        )}
      >
        <span
          className={cn(
            "absolute w-3.5 h-3.5 rounded-full bg-paper-soft transition-all",
            checked ? "left-[15px]" : "left-[3px]",
          )}
        />
      </span>
      <span className="text-xs text-ink">{label}</span>
    </button>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (href.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
}
