import Taro from "@tarojs/taro";
import { useEffect } from "react";
import type { Character, Novel, Relation } from "@/types";
import { BottomSheet } from "@/components/BottomSheet";

interface ExportStudioProps {
  open: boolean;
  novel: Novel | null;
  characters: Character[];
  relations: Relation[];
  onClose: () => void;
}

/** 小程序端暂用提示；装裱导出依赖 DOM，后续可用 canvas 导出完善 */
export function ExportStudio({ open, novel, onClose }: ExportStudioProps) {
  useEffect(() => {
    if (open) {
      Taro.showToast({
        title: "小程序装裱导出开发中，可先用 H5",
        icon: "none",
        duration: 2200,
      });
    }
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose} title="装裱导出">
      <div className="px-4 pb-8 text-sm text-ink-mute font-song leading-relaxed">
        <p>「{novel?.title || "未名"}」的装裱导出在微信小程序端仍在适配中。</p>
        <p className="mt-3">请暂时使用 H5 端完成 PNG / JPEG 导出与分享。</p>
        <button type="button" className="btn-primary mt-6 w-full h-11" onClick={onClose}>
          知道了
        </button>
      </div>
    </BottomSheet>
  );
}
