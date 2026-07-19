import { useMemo, useState } from "react";
import { useNovelStore } from "@/store/useNovelStore";
import { NovelCard } from "@/components/NovelCard";
import { NovelForm } from "@/components/NovelForm";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Seal, SealStamp } from "@/components/Seal";
import { Edit3, Copy, Download, Trash2, Plus, Search } from "lucide-react";
import type { Novel, NovelInput } from "@/types";
import { useNavigate } from "react-router-dom";

type SortKey = "updated" | "title";

export default function Library() {
  const navigate = useNavigate();
  const novels = useNovelStore((s) => s.novels);
  const characters = useNovelStore((s) => s.characters);
  const relations = useNovelStore((s) => s.relations);
  const createNovel = useNovelStore((s) => s.createNovel);
  const updateNovel = useNovelStore((s) => s.updateNovel);
  const deleteNovel = useNovelStore((s) => s.deleteNovel);
  const duplicateNovel = useNovelStore((s) => s.duplicateNovel);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Novel | null>(null);
  const [menuNovel, setMenuNovel] = useState<Novel | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Novel | null>(null);

  const stats = useMemo(
    () => ({
      novelCount: novels.length,
      characterCount: characters.length,
      relationCount: relations.length,
    }),
    [novels, characters, relations],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = novels;
    if (q) {
      list = novels.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.author.toLowerCase().includes(q) ||
          n.synopsis.toLowerCase().includes(q),
      );
    }
    if (sort === "updated") {
      list = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      list = [...list].sort((a, b) =>
        a.title.localeCompare(b.title, "zh-Hans-CN"),
      );
    }
    return list;
  }, [novels, query, sort]);

  const handleCreate = (input: NovelInput) => {
    const id = createNovel(input);
    setCreating(false);
    navigate(`/editor/${id}`);
  };

  const handleEdit = (input: NovelInput) => {
    if (editing) {
      updateNovel(editing.id, input);
      setEditing(null);
    }
  };

  return (
    <div className="min-h-full">
      {/* ===== HERO ===== */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-10 w-56 h-56 opacity-[0.07]">
            <SealStamp className="w-full h-full" />
          </div>
          <div className="absolute top-20 -left-16 w-72 h-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-40 bg-vermillion/10 blur-3xl pointer-events-none" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3 animate-fade-in">
                <Seal text="墨缘" size={44} rotate={-4} />
                <div>
                  <p className="text-[11px] tracking-seal text-ink-mute uppercase font-display">
                    Ink · Bond
                  </p>
                  <p className="text-[11px] tracking-editorial text-ink-mute">
                    读完一卷书 · 珍藏一群人
                  </p>
                </div>
              </div>
              <h1 className="font-song font-bold text-5xl sm:text-7xl text-ink leading-none tracking-editorial animate-fade-up">
                墨缘
              </h1>
              <p
                className="mt-4 text-ink-soft text-base sm:text-lg max-w-md leading-relaxed font-song animate-fade-up"
                style={{ animationDelay: "60ms" }}
              >
                为小说读者而作的人物关系图谱。把错综的人缘
                <span className="text-vermillion">·</span>梳理为可看可分享的一卷。
              </p>
            </div>
            <div className="hidden sm:block">
              <SealStamp className="w-28 h-28 opacity-90 animate-seal-press" />
            </div>
          </div>

          {/* Stats */}
          <div
            className="mt-8 grid grid-cols-3 max-w-md border-y border-ink/15 divide-x divide-ink/10 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            <Stat label="藏书" value={stats.novelCount} suffix="卷" />
            <Stat label="人物" value={stats.characterCount} suffix="人" />
            <Stat label="关系" value={stats.relationCount} suffix="缘" />
          </div>
        </div>
      </header>

      {/* ===== TOOLBAR ===== */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-3 py-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search
              className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute"
              strokeWidth={1.6}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="检索书名、作者、内容…"
              className="w-full bg-transparent border-0 border-b border-ink/15 pl-7 pr-2 py-2 text-sm focus:outline-none focus:border-vermillion transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 text-[12px] tracking-editorial text-ink-mute">
            <button
              onClick={() => setSort("updated")}
              className={
                sort === "updated"
                  ? "border-b-2 border-vermillion text-ink px-2 py-1"
                  : "px-2 py-1 hover:text-ink"
              }
            >
              近时
            </button>
            <span className="text-ink/20">·</span>
            <button
              onClick={() => setSort("title")}
              className={
                sort === "title"
                  ? "border-b-2 border-vermillion text-ink px-2 py-1"
                  : "px-2 py-1 hover:text-ink"
              }
            >
              书名
            </button>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            新开一卷
          </button>
        </div>

        {/* ===== SHELF ===== */}
        {filtered.length === 0 ? (
          <EmptyShelf onCreate={() => setCreating(true)} hasQuery={query.length > 0} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
            {filtered.map((novel, i) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                index={i}
                characters={characters.filter((c) => c.novelId === novel.id)}
                relations={relations.filter((r) => r.novelId === novel.id)}
                onMore={(_e, n) => setMenuNovel(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== Create sheet ===== */}
      <BottomSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="新开一卷"
        subtitle="为这部小说留下专属的人物关系图谱"
        size="auto"
      >
        <NovelForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitText="建卷并进入"
        />
      </BottomSheet>

      {/* ===== Edit sheet ===== */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑卷宗信息"
        subtitle={editing?.title}
      >
        {editing && (
          <NovelForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitText="保存修订"
          />
        )}
      </BottomSheet>

      {/* ===== Card menu ===== */}
      <BottomSheet
        open={!!menuNovel}
        onClose={() => setMenuNovel(null)}
        title={menuNovel?.title}
        subtitle="选择操作"
        size="auto"
      >
        {menuNovel && (
          <div className="flex flex-col py-1">
            <MenuRow
              icon={<Edit3 className="w-4 h-4" strokeWidth={1.6} />}
              label="编辑信息"
              onClick={() => {
                setEditing(menuNovel);
                setMenuNovel(null);
              }}
            />
            <MenuRow
              icon={<Copy className="w-4 h-4" strokeWidth={1.6} />}
              label="复制副本"
              onClick={() => {
                duplicateNovel(menuNovel.id);
                setMenuNovel(null);
              }}
            />
            <MenuRow
              icon={<Download className="w-4 h-4" strokeWidth={1.6} />}
              label="直接导出图谱"
              onClick={() => {
                const id = menuNovel.id;
                setMenuNovel(null);
                navigate(`/editor/${id}?export=open`);
              }}
            />
            <MenuRow
              icon={<Trash2 className="w-4 h-4" strokeWidth={1.6} />}
              label="删除此卷"
              tone="danger"
              onClick={() => {
                setConfirmDelete(menuNovel);
                setMenuNovel(null);
              }}
            />
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title={`删除《${confirmDelete?.title}》？`}
        description="此操作将同时删除该卷下所有人物与关系，无法恢复。"
        tone="danger"
        confirmText="删除"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteNovel(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="px-4 py-3 flex flex-col items-center justify-center">
      <div className="flex items-baseline gap-1">
        <span className="font-display text-3xl sm:text-4xl font-semibold text-ink tabular-nums">
          {value}
        </span>
        <span className="text-xs text-ink-mute">{suffix}</span>
      </div>
      <span className="text-[11px] tracking-seal text-ink-mute mt-0.5">
        {label}
      </span>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center gap-3 px-3 py-3.5 text-left text-sm rounded-[2px] transition-colors hover:bg-ink/5 " +
        (tone === "danger" ? "text-vermillion" : "text-ink")
      }
    >
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="tracking-editorial">{label}</span>
    </button>
  );
}

function EmptyShelf({
  onCreate,
  hasQuery,
}: {
  onCreate: () => void;
  hasQuery: boolean;
}) {
  return (
    <div className="py-20 flex flex-col items-center text-center">
      <Seal text="空" size={56} rotate={3} tone="gold" />
      <p className="mt-5 font-song text-2xl text-ink">
        {hasQuery ? "未检得此书" : "书架尚虚"}
      </p>
      <p className="mt-2 text-sm text-ink-mute max-w-xs">
        {hasQuery
          ? "换一组关键词再试试看。"
          : "读完一卷书，便可在此为其中人物立传。"}
      </p>
      {!hasQuery && (
        <button onClick={onCreate} className="btn-primary mt-6">
          <Plus className="w-4 h-4" strokeWidth={1.8} />
          新开一卷
        </button>
      )}
    </div>
  );
}
