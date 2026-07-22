import { useState } from "react";
import { Plus, UserPlus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  onAddCharacter: () => void;
  onAddRelation: () => void;
}

export function Fab({ onAddCharacter, onAddRelation }: FabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-[1px] animate-fade-in md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-4 z-40 flex flex-col items-end gap-2.5 pointer-events-none">
        <div
          className={cn(
            "flex flex-col items-end gap-2.5 transition-[opacity,transform] duration-300 origin-bottom",
            open
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none translate-y-2",
          )}
        >
          <FabItem
            label="新建关系"
            icon={<Link2 className="w-4 h-4" strokeWidth={1.6} />}
            tone="default"
            onClick={() => {
              setOpen(false);
              onAddRelation();
            }}
          />
          <FabItem
            label="新增人物"
            icon={<UserPlus className="w-4 h-4" strokeWidth={1.6} />}
            tone="gold"
            onClick={() => {
              setOpen(false);
              onAddCharacter();
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "pointer-events-auto relative w-14 h-14 rounded-full bg-vermillion text-paper-soft shadow-seal flex items-center justify-center transition-[transform] duration-300 active:scale-95",
            open && "rotate-45",
          )}
          style={{
            boxShadow:
              "0 0 0 1px rgba(168,50,45,0.25), 0 12px 28px -8px rgba(168,50,45,0.45)",
          }}
          aria-label={open ? "收起" : "展开操作"}
        >
          <Plus className="w-6 h-6" strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}

function FabItem({
  label,
  icon,
  onClick,
  tone = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "gold";
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 group">
      <span
        className={cn(
          "font-song text-sm px-3 py-1.5 rounded-[2px] shadow-paper border border-ink/10 transition-transform duration-200 group-hover:translate-x-[-2px]",
          tone === "gold" ? "bg-gold/15 text-gold-deep" : "bg-paper-soft text-ink",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "w-10 h-10 rounded-full shadow-paper border border-ink/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
          tone === "gold" ? "bg-gold text-paper-soft" : "bg-paper-soft text-ink",
        )}
      >
        {icon}
      </span>
    </button>
  );
}
