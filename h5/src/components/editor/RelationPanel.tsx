import { useEffect, useState } from "react";
import type { Character, Relation, RelationType, Direction } from "@/types";
import { RELATION_TYPES, cn, getRelationMeta } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconTrash } from "@/components/uiIcons";

interface RelationPanelProps {
  open: boolean;
  relation: Relation | null;
  source: Character | null;
  target: Character | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Relation>) => void;
  onDelete: (id: string) => void;
}

export function RelationPanel({
  open,
  relation,
  source,
  target,
  onClose,
  onSave,
  onDelete,
}: RelationPanelProps) {
  const [type, setType] = useState<RelationType>("other");
  const [direction, setDirection] = useState<Direction>("one-way");
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (relation) {
      setType(relation.type);
      setDirection(relation.direction);
      setNote(relation.note);
      setDirty(false);
    }
  }, [relation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!relation || !source || !target) return null;

  const save = () => {
    onSave(relation.id, { type, direction, note: note.trim() });
    onClose();
  };

  const meta = getRelationMeta(type);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-[2px] font-song text-xs font-bold text-paper-soft"
            style={{ backgroundColor: meta.color }}
          >
            {meta.glyph}
          </span>
          编辑关系
          {dirty && (
            <span className="text-[10px] text-gold tracking-editorial">未存</span>
          )}
        </span>
      }
      subtitle={`${source.name} → ${target.name}`}
      footer={
        <>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost text-vermillion border-vermillion/30 flex-1"
          >
            <IconTrash className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
            删除
          </button>
          <button type="button" onClick={save} className="btn-primary flex-[2]">
            保存
          </button>
        </>
      }
    >
      <div className="space-y-5 pt-1 pb-3">
        {/* source → target visual — tap to swap endpoints when one-way */}
        <div
          role={direction === "one-way" ? "button" : undefined}
          tabIndex={direction === "one-way" ? 0 : undefined}
          onClick={
            direction === "one-way"
              ? () =>
                  onSave(relation.id, {
                    sourceId: target.id,
                    targetId: source.id,
                  })
              : undefined
          }
          title={direction === "one-way" ? "点击互换源与目标" : undefined}
          className={cn(
            "flex items-center justify-between gap-3 p-3 rounded-[3px] border transition-colors select-none",
            direction === "one-way"
              ? "border-ink/20 bg-paper-deep/40 hover:bg-paper-deep/70 active:bg-paper-deep cursor-pointer"
              : "border-ink/10 bg-paper-deep/40",
          )}
        >
          <NodeLabel color={source.color} name={source.name} sub="源" />
          <div className="flex-1 flex items-center justify-center">
            <div
              className="h-px flex-1"
              style={{ backgroundColor: meta.color, opacity: 0.5 }}
            />
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full mx-1"
              style={{ backgroundColor: meta.color, color: "#faf6ec" }}
            >
              {direction === "mutual" ? (
                <span>↔</span>
              ) : (
                <span>→</span>
              )}
            </span>
            <div
              className="h-px flex-1"
              style={{ backgroundColor: meta.color, opacity: 0.5 }}
            />
          </div>
          <NodeLabel color={target.color} name={target.name} sub="的" align="right" />
        </div>
        {direction === "one-way" && (
          <p className="-mt-3 text-center text-[10px] text-ink-mute tracking-seal">
            点击上方区块可互换源与目标
          </p>
        )}

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            关系 · TYPE
          </label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {RELATION_TYPES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setType(r.key);
                  setDirty(true);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 rounded-[2px] border transition-all duration-150",
                  type === r.key
                    ? "border-ink bg-paper-soft shadow-paper"
                    : "bg-transparent border-ink/10 hover:bg-ink/5",
                )}
              >
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-[2px] font-song text-[11px] font-bold text-paper-soft"
                  style={{ backgroundColor: r.color }}
                >
                  {r.glyph}
                </span>
                <span className="text-[11px] text-ink">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            方向 · DIRECTION
          </label>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setDirection("one-way");
                setDirty(true);
              }}
              className={cn(
                "flex-1 h-11 rounded-[2px] border flex items-center justify-center gap-2 transition-all",
                direction === "one-way"
                  ? "border-ink bg-paper-soft shadow-paper"
                  : "bg-transparent border-ink/10 hover:bg-ink/5",
              )}
            >
              <span>→</span>
              <span className="text-sm">单向</span>
              <span className="text-[11px] text-ink-mute">源 → 的</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("mutual");
                setDirty(true);
              }}
              className={cn(
                "flex-1 h-11 rounded-[2px] border flex items-center justify-center gap-2 transition-all",
                direction === "mutual"
                  ? "border-ink bg-paper-soft shadow-paper"
                  : "bg-transparent border-ink/10 hover:bg-ink/5",
              )}
            >
              <span>↔</span>
              <span className="text-sm">双向</span>
              <span className="text-[11px] text-ink-mute">互为</span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            注解 · NOTE
          </label>
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
            placeholder="例：夫妻、青梅竹马、宿敌…"
            className="field-line"
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="删除此关系？"
        description={`将切断「${source.name}」与「${target.name}」之间的连接。`}
        tone="danger"
        confirmText="删除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete(relation.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function NodeLabel({
  color,
  name,
  sub,
  align = "left",
}: {
  color: string;
  name: string;
  sub: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0 max-w-[36%]",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <span
        className="inline-block w-7 h-7 rounded-full border-2 border-paper-soft shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <p className="font-song text-sm text-ink truncate leading-tight">
          {name}
        </p>
        <p className="text-[10px] text-ink-mute tracking-seal">{sub}</p>
      </div>
    </div>
  );
}
