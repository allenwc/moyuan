import { useEffect, useState } from "react";
import type { CharacterInput } from "@/types";
import {
  CHARACTER_COLOR_PRESETS,
  CHARACTER_ROLES,
  cn,
} from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";

interface AddCharacterSheetProps {
  open: boolean;
  initialPosition: { x: number; y: number };
  onClose: () => void;
  onAdd: (input: CharacterInput) => void;
}

export function AddCharacterSheet({
  open,
  initialPosition,
  onClose,
  onAdd,
}: AddCharacterSheetProps) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [role, setRole] = useState("主角");
  const [faction, setFaction] = useState("");
  const [color, setColor] = useState(CHARACTER_COLOR_PRESETS[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setAlias("");
      setRole("主角");
      setFaction("");
      setColor(CHARACTER_COLOR_PRESETS[Math.floor(Math.random() * CHARACTER_COLOR_PRESETS.length)]);
      setNote("");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      alias: alias.trim() || undefined,
      role,
      faction: faction.trim(),
      color,
      note: note.trim(),
      x: initialPosition.x,
      y: initialPosition.y,
    });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="新增人物"
      subtitle="为此人立一小传"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost flex-1">
            取消
          </button>
          <button
            onClick={submit}
            className={cn("btn-primary flex-[2]", !name.trim() && "opacity-50")}
          >
            添加
          </button>
        </>
      }
    >
      <div className="space-y-5 pt-1 pb-3">
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            姓名 · NAME
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：林黛玉"
            className="field-line font-song text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] tracking-seal text-ink-mute uppercase">
              别号 · ALIAS
            </label>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
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
              onChange={(e) => setFaction(e.target.value)}
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
                onClick={() => setRole(r)}
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
                onClick={() => setColor(c)}
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
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            小传 · NOTE
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="为人物立一小传：出身、性情、关键事件…"
            className="w-full bg-transparent border-0 border-b border-ink/20 px-0 py-2 text-ink placeholder:text-ink/35 focus:outline-none focus:border-vermillion transition-colors duration-200 resize-none leading-relaxed"
          />
        </div>
      </div>
    </BottomSheet>
  );
}
