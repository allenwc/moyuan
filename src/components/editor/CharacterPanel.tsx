import { useEffect, useState } from "react";
import type { Character, Gender, Relation } from "@/types";
import {
  CHARACTER_COLOR_PRESETS,
  CHARACTER_GENDERS,
  CHARACTER_ROLES,
  cn,
  getRelationMeta,
} from "@/lib/utils";
import { GenderShape, getGenderShape } from "@/lib/GenderShape";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Trash2, ArrowRight, ArrowLeftRight } from "lucide-react";

interface CharacterPanelProps {
  open: boolean;
  character: Character | null;
  relations: Relation[];
  characters: Character[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<Character>) => void;
  onDelete: (id: string) => void;
  onSelectRelation: (relationId: string) => void;
}

export function CharacterPanel({
  open,
  character,
  relations,
  characters,
  onClose,
  onSave,
  onDelete,
  onSelectRelation,
}: CharacterPanelProps) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState("");
  const [faction, setFaction] = useState("");
  const [color, setColor] = useState("");
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setAlias(character.alias ?? "");
      setRole(character.role);
      setFaction(character.faction);
      setColor(character.color);
      setGender(character.gender);
      setNote(character.note);
      setDirty(false);
    }
  }, [character?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!character) return null;

  const update = (patch: Partial<Character>) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.alias !== undefined) setAlias(patch.alias);
    if (patch.role !== undefined) setRole(patch.role);
    if (patch.faction !== undefined) setFaction(patch.faction);
    if (patch.color !== undefined) setColor(patch.color);
    if ("gender" in patch) setGender(patch.gender);
    if (patch.note !== undefined) setNote(patch.note);
    setDirty(true);
  };

  const related = relations
    .filter((r) => r.sourceId === character.id || r.targetId === character.id)
    .map((r) => {
      const otherId = r.sourceId === character.id ? r.targetId : r.sourceId;
      const other = characters.find((c) => c.id === otherId);
      const meta = getRelationMeta(r.type);
      const outward = r.sourceId === character.id;
      return { relation: r, other, meta, outward };
    })
    .filter((r) => r.other);

  const save = () => {
    onSave(character.id, {
      name: name.trim() || "无名氏",
      alias: alias.trim() || undefined,
      role,
      faction,
      color,
      gender,
      note,
    });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={dirty ? () => { onClose(); } : onClose}
      title={
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-5 h-5 rounded-full border border-ink/15"
            style={{ backgroundColor: color }}
          />
          {dirty ? `${name || "无名氏"} ·` : name || "无名氏"}
          {dirty && <span className="text-[10px] text-gold tracking-editorial">未存</span>}
        </span>
      }
      subtitle={alias ? `别号 · ${alias}` : role || "未分类"}
      footer={
        <>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-ghost text-vermillion border-vermillion/30 flex-1"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.6} />
            删除
          </button>
          <button onClick={save} className="btn-primary flex-[2]">
            保存
          </button>
        </>
      }
    >
      <div className="space-y-5 pt-1 pb-3">
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            姓名 · NAME
          </label>
          <div className="flex items-center gap-3 mt-1">
            <input
              value={name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="例：林黛玉"
              className="field-line font-song text-lg flex-1 min-w-0"
            />
            <div className="flex gap-1.5 shrink-0">
              {[
                ...CHARACTER_GENDERS,
                { key: undefined, label: "未知", color: "#6b6359" },
              ].map((g) => {
                const selected = gender === g.key;
                return (
                  <button
                    key={g.label}
                    type="button"
                    title={g.label}
                    onClick={() => update({ gender: g.key })}
                    className={cn(
                      "flex items-center gap-1 px-2.5 h-9 rounded-[3px] border transition-all duration-150",
                      selected
                        ? "bg-ink text-paper-soft border-ink"
                        : "border-ink/15 text-ink-mute hover:bg-ink/5",
                    )}
                  >
                    <GenderShape
                      shape={getGenderShape(g.key)}
                      r={5}
                      fill={selected ? "#faf6ec" : g.color}
                      stroke="none"
                      strokeWidth={0}
                    />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] tracking-seal text-ink-mute uppercase">
              别号 · ALIAS
            </label>
            <input
              value={alias}
              onChange={(e) => update({ alias: e.target.value })}
              placeholder="潇湘妃子"
              className="field-line"
            />
          </div>
          <div>
            <label className="text-[11px] tracking-seal text-ink-mute uppercase">
              阵营 · FACTION
            </label>
            <input
              value={faction}
              onChange={(e) => update({ faction: e.target.value })}
              placeholder="贾府"
              className="field-line"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            身份 · ROLE
          </label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {CHARACTER_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => update({ role: r })}
                className={cn(
                  "px-3 h-7 text-xs rounded-[2px] border transition-all duration-150",
                  role === r
                    ? "bg-ink text-paper-soft border-ink"
                    : "border-ink/15 text-ink-mute hover:bg-ink/5",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            色相 · COLOR
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CHARACTER_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => update({ color: c })}
                className={cn(
                  "w-9 h-9 rounded-full border-2 transition-all duration-150",
                  color === c
                    ? "scale-110 border-ink"
                    : "border-paper-soft hover:scale-105",
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <label className="relative w-9 h-9 rounded-full border-2 border-dashed border-ink/30 flex items-center justify-center cursor-pointer overflow-hidden">
              <input
                type="color"
                value={color}
                onChange={(e) => update({ color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <span
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: color }}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            小传 · NOTE
          </label>
          <textarea
            value={note}
            onChange={(e) => update({ note: e.target.value })}
            rows={3}
            placeholder="为其人立一小传：出身、性情、关键事件…"
            className="w-full bg-transparent border-0 border-b border-ink/20 px-0 py-2 text-ink placeholder:text-ink/35 focus:outline-none focus:border-vermillion transition-colors duration-200 resize-none leading-relaxed"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] tracking-seal text-ink-mute uppercase">
              关系 · RELATIONS
            </label>
            <span className="text-[10px] text-ink-mute">{related.length} 缘</span>
          </div>
          <div className="mt-2 space-y-1">
            {related.length === 0 ? (
              <p className="text-sm text-ink-mute py-4 text-center bg-paper-deep/40 rounded-[2px]">
                尚无关系。在画布上长按此节点，再点另一位人物即可建立。
              </p>
            ) : (
              related.map(({ relation, other, meta, outward }) => (
                <button
                  key={relation.id}
                  onClick={() => onSelectRelation(relation.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[2px] border border-ink/10 hover:bg-ink/5 transition-colors text-left"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-[2px] font-song text-[11px] font-bold text-paper-soft"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.glyph}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ink truncate">
                      {other!.name}
                      {outward ? "" : "（彼向此）"}
                    </span>
                    {relation.note && (
                      <span className="block text-[11px] text-ink-mute truncate">
                        {relation.note}
                      </span>
                    )}
                  </span>
                  {relation.direction === "mutual" ? (
                    <ArrowLeftRight className="w-3 h-3 text-ink-mute" strokeWidth={1.6} />
                  ) : (
                    <ArrowRight className="w-3 h-3 text-ink-mute" strokeWidth={1.6} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`删除「${character.name}」？`}
        description="此操作将同时删除该人物的所有关系，且无法恢复。"
        tone="danger"
        confirmText="删除"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete(character.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
