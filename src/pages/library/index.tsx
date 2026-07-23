import { useEffect, useMemo, useRef, useState } from "react";
import Taro, { useDidShow, usePageScroll, useReady } from "@tarojs/taro";
import { useNovelStore } from "@/store/useNovelStore";
import { useAuthStore } from "@/store/useAuthStore";
import { NovelCard } from "@/components/NovelCard";
import { NovelForm } from "@/components/NovelForm";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Seal, SealStamp } from "@/components/Seal";
import {
  IconEdit,
  IconCopy,
  IconDownload,
  IconTrash,
  IconPlus,
  IconSearch,
} from "@/components/uiIcons";
import type { Novel, NovelInput } from "@/types";
import type { SessionUser } from "@/lib/authStorage";
import { goEditor, goLogin } from "@/lib/nav";
import {
  readerSealChar,
  readerShortLabel,
  readerFullLabel,
  readerChannelLabel,
} from "@/lib/readerIdentity";
import "./index.scss";

type SortKey = "updated" | "title";

const IS_WEAPP = process.env.TARO_ENV === "weapp";
const BAR = 56; // 收缩头高度（h-14）

/** 找到真实滚动容器；Taro H5 常不在 window 上滚 */
function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  if (!el || typeof window === "undefined") return window;
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  const candidates = [
    document.querySelector(".taro_page.taro_page_show"),
    document.querySelector(".taro_page_show"),
    document.querySelector(".taro_page"),
    document.getElementById("app"),
  ].filter(Boolean) as HTMLElement[];
  for (const c of candidates) {
    if (c.scrollHeight > c.clientHeight + 1) return c;
  }
  return window;
}

export default function LibraryPage() {
  const authReady = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.init);
  const hydrated = useNovelStore((s) => s.hydrated);
  const hydrate = useNovelStore((s) => s.hydrate);
  const loadError = useNovelStore((s) => s.loadError);
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // 检索栏到达吸顶位（top-14）时 pinned=true
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [wrapHeight, setWrapHeight] = useState<number | undefined>(undefined);
  const weappScrollRaf = useRef(0);

  const syncWrapHeight = () => {
    const t = toolbarRef.current;
    if (t?.offsetHeight) {
      setWrapHeight(t.offsetHeight);
      return;
    }
    if (!IS_WEAPP) return;
    Taro.createSelectorQuery()
      .select("#library-toolbar")
      .boundingClientRect()
      .exec((res) => {
        const rect = res?.[0] as { height?: number } | undefined;
        if (rect?.height) setWrapHeight(rect.height);
      });
  };

  /** 用 wrap 视口 top 判断，避免阈值在字体/布局变化后过期（resize 才生效） */
  const updatePinnedFromWrap = () => {
    const wrap = toolbarWrapRef.current;
    if (!wrap) return;
    setPinned(wrap.getBoundingClientRect().top <= BAR + 0.5);
  };

  const updatePinnedWeapp = () => {
    Taro.createSelectorQuery()
      .select("#library-toolbar-wrap")
      .boundingClientRect()
      .exec((res) => {
        const top = (res?.[0] as { top?: number } | undefined)?.top;
        if (top == null) return;
        setPinned(top <= BAR + 0.5);
      });
  };

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useDidShow(() => {
    void initAuth();
  });

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      goLogin();
      return;
    }
    if (!hydrated) void hydrate();
  }, [authReady, user, hydrated, hydrate]);

  // H5：绑真实滚动根 + 布局稳定后多次重测
  useEffect(() => {
    if (IS_WEAPP || typeof window === "undefined") return;
    if (!user || !hydrated) return;

    let raf = 0;
    let scrollRoot: HTMLElement | Window = window;
    let alsoWindow = false;
    let ro: ResizeObserver | null = null;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updatePinnedFromWrap();
      });
    };

    const detach = (root: HTMLElement | Window) => {
      root.removeEventListener("scroll", onScroll);
    };

    const attach = (root: HTMLElement | Window) => {
      root.addEventListener("scroll", onScroll, { passive: true });
    };

    const rebindRoot = () => {
      const next = getScrollParent(toolbarWrapRef.current);
      if (next !== scrollRoot) {
        detach(scrollRoot);
        scrollRoot = next;
        attach(scrollRoot);
      }
      const needWindow = scrollRoot !== window;
      if (needWindow && !alsoWindow) {
        window.addEventListener("scroll", onScroll, { passive: true });
        alsoWindow = true;
      }
      if (!needWindow && alsoWindow) {
        window.removeEventListener("scroll", onScroll);
        alsoWindow = false;
      }
    };

    const syncAll = () => {
      rebindRoot();
      syncWrapHeight();
      updatePinnedFromWrap();
    };

    rebindRoot();
    syncWrapHeight();
    updatePinnedFromWrap();
    window.addEventListener("resize", syncAll);

    requestAnimationFrame(() => {
      requestAnimationFrame(syncAll);
    });

    const fontsReady = document.fonts?.ready;
    if (fontsReady) void fontsReady.then(syncAll);

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => syncAll());
      if (toolbarWrapRef.current) ro.observe(toolbarWrapRef.current);
      if (toolbarRef.current) ro.observe(toolbarRef.current);
      const page =
        document.querySelector(".taro_page.taro_page_show") ||
        document.querySelector(".taro_page") ||
        document.getElementById("app");
      if (page) ro.observe(page);
    }

    const t1 = window.setTimeout(syncAll, 100);
    const t2 = window.setTimeout(syncAll, 400);

    return () => {
      detach(scrollRoot);
      if (alsoWindow) window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncAll);
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [hydrated, user, novels.length]);

  // weapp：页面滚动用 wrap 视口 top；加载后再测占位高度
  useReady(() => {
    if (!IS_WEAPP) return;
    syncWrapHeight();
    updatePinnedWeapp();
  });

  useEffect(() => {
    if (!IS_WEAPP || !hydrated || !user) return;
    const t1 = setTimeout(() => {
      syncWrapHeight();
      updatePinnedWeapp();
    }, 50);
    const t2 = setTimeout(() => {
      syncWrapHeight();
      updatePinnedWeapp();
    }, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hydrated, user, novels.length]);

  usePageScroll(() => {
    if (!IS_WEAPP) return;
    if (weappScrollRaf.current) return;
    weappScrollRaf.current = requestAnimationFrame(() => {
      weappScrollRaf.current = 0;
      updatePinnedWeapp();
    });
  });

  // 进入吸顶时立刻量占位高度，避免列表上跳
  useEffect(() => {
    if (pinned) syncWrapHeight();
  }, [pinned]);

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
    if (id) goEditor(id);
  };

  const handleEdit = (input: NovelInput) => {
    if (editing) {
      updateNovel(editing.id, input);
      setEditing(null);
    }
  };

  const handleLogout = () => {
    void useAuthStore
      .getState()
      .signOut()
      .then(() => {
        Taro.showToast({ title: "已退出", icon: "none" });
        goLogin();
      });
  };

  if (!authReady || (user && !hydrated)) {
    return (
      <div className="library-loading">
        <div className="library-loading-spin" />
        <p>正在载入卷宗…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="library-loading">
        <p>请先登录</p>
        <button type="button" className="btn-primary" onClick={() => goLogin()}>
          前往登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent">
      {loadError ? (
        <div className="library-error">云端数据加载失败：{loadError}</div>
      ) : null}

      {/* ===== 收缩头：下拉时滑入的精简头部 ===== */}
      <div
        className={
          "fixed inset-x-0 top-0 z-40 transition-[transform,opacity,background-color] duration-300 ease-out motion-reduce:transition-none " +
          (pinned
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none")
        }
        style={{
          background: "rgba(245,239,226,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div className="safe-top max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Seal text="墨缘" size={30} rotate={-3} />
            <span className="font-song font-bold text-lg text-ink tracking-editorial">
              墨缘
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <ReaderMark
              user={user}
              compact
              onOpen={() => setAccountOpen(true)}
            />
            <span className="text-[10px] sm:text-[11px] tracking-seal text-ink-mute tabular-nums whitespace-nowrap shrink-0">
              {stats.novelCount}卷 · {stats.characterCount}人 ·{" "}
              {stats.relationCount}缘
            </span>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary text-xs h-9 px-3.5 whitespace-nowrap shrink-0"
            >
              <IconPlus className="w-3.5 h-3.5 text-paper-soft" strokeWidth={1.8} />
              新开一卷
            </button>
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <header className="relative overflow-hidden">
        {/* weapp blur 会退化成硬色块；水印印块也偏脏，仅 H5 保留氛围层 */}
        {!IS_WEAPP && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 -right-10 w-56 h-56 opacity-[0.07]">
              <SealStamp className="w-full h-full" />
            </div>
            <div className="absolute top-20 -left-16 w-72 h-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-80 h-40 bg-vermillion/10 blur-3xl pointer-events-none" />
          </div>
        )}

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
                <span className="text-vermillion">·</span>
                梳理为可看可分享的一卷。
              </p>
            </div>
            <div className="hidden sm:block shrink-0">
              <SealStamp className="w-28 h-28 opacity-90 animate-seal-press" />
            </div>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
              <ReaderMark user={user} onOpen={() => setAccountOpen(true)} />
              <p className="text-[12px] sm:text-[13px] tracking-seal text-ink-mute tabular-nums">
                {stats.novelCount}卷 · {stats.characterCount}人 ·{" "}
                {stats.relationCount}缘
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary text-xs sm:text-sm whitespace-nowrap shrink-0"
            >
              <IconPlus className="w-4 h-4 text-paper-soft" strokeWidth={1.8} />
              新开一卷
            </button>
          </div>
        </div>
      </header>

      {/* ===== TOOLBAR ===== */}
      <div
        id="library-toolbar-wrap"
        ref={toolbarWrapRef}
        className="relative"
        style={
          pinned && wrapHeight != null ? { height: wrapHeight } : undefined
        }
      >
        <div
          id="library-toolbar"
          ref={toolbarRef}
          className={
            "z-30 transition-colors duration-300 " +
            (pinned
              ? "fixed inset-x-0 top-14 bg-paper/90 backdrop-blur-[10px] border-b border-ink/10"
              : "sticky top-14")
          }
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex flex-wrap items-center gap-3 py-4">
              <div className="flex-1 min-w-[200px] relative">
                <IconSearch
                  aria-hidden="true"
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none"
                  strokeWidth={1.6}
                />
                <input
                  aria-label="检索藏书"
                  value={query}
                  onInput={(e) =>
                    setQuery((e.target as HTMLInputElement).value)
                  }
                  placeholder="检索书名、作者、内容…"
                  className="field-line w-full bg-transparent border-0 border-b border-ink/15 pl-7 pr-2 py-2 text-sm leading-5 focus:border-vermillion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion/30 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1 text-[12px] leading-[1.6] tracking-editorial text-ink-mute">
                <button
                  type="button"
                  aria-pressed={sort === "updated"}
                  onClick={() => setSort("updated")}
                  className={
                    "text-[12px] leading-[19.2px] tracking-editorial " +
                    (sort === "updated"
                      ? "bg-transparent border-0 border-b-2 border-vermillion text-ink px-2 py-1"
                      : "bg-transparent border-0 border-b-2 border-transparent px-2 py-1 hover:text-ink")
                  }
                  style={{ fontSize: 12, lineHeight: "19.2px" }}
                >
                  近时
                </button>
                <span className="text-ink/20" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  aria-pressed={sort === "title"}
                  onClick={() => setSort("title")}
                  className={
                    "text-[12px] leading-[19.2px] tracking-editorial " +
                    (sort === "title"
                      ? "bg-transparent border-0 border-b-2 border-vermillion text-ink px-2 py-1"
                      : "bg-transparent border-0 border-b-2 border-transparent px-2 py-1 hover:text-ink")
                  }
                  style={{ fontSize: 12, lineHeight: "19.2px" }}
                >
                  书名
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SHELF ===== */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {filtered.length === 0 ? (
          <EmptyShelf
            onCreate={() => setCreating(true)}
            hasQuery={query.length > 0}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
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

        <div className="pb-16" />
      </div>

      <BottomSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="藏书人"
        subtitle={readerChannelLabel(user)}
        size="auto"
      >
        <div className="flex flex-col py-1">
          <div className="px-3 py-3">
            <p className="font-song text-lg text-ink leading-snug break-all">
              {readerFullLabel(user)}
            </p>
          </div>
          <div className="mx-3 border-t border-ink/10" />
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setConfirmLogout(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-3.5 text-left text-sm rounded-[2px] bg-transparent appearance-none font-inherit transition-colors hover:bg-ink/5 text-vermillion"
          >
            <span className="tracking-editorial">退出登录</span>
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmLogout}
        title="合上此匣？"
        description="退出后需重新登录才能翻阅藏书。云端卷宗仍会保留。"
        tone="danger"
        confirmText="退出登录"
        cancelText="继续翻阅"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          handleLogout();
        }}
      />

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

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="编辑卷宗信息"
        subtitle={editing?.title}
      >
        {editing ? (
          <NovelForm
            initial={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitText="保存修订"
          />
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={!!menuNovel}
        onClose={() => setMenuNovel(null)}
        title={menuNovel?.title}
        subtitle="选择操作"
        size="auto"
      >
        {menuNovel ? (
          <div className="flex flex-col py-1">
            <MenuRow
              icon={<IconEdit className="w-4 h-4" strokeWidth={1.6} />}
              label="编辑信息"
              onClick={() => {
                setEditing(menuNovel);
                setMenuNovel(null);
              }}
            />
            <MenuRow
              icon={<IconCopy className="w-4 h-4" strokeWidth={1.6} />}
              label="复制副本"
              onClick={() => {
                duplicateNovel(menuNovel.id);
                setMenuNovel(null);
              }}
            />
            <MenuRow
              icon={<IconDownload className="w-4 h-4" strokeWidth={1.6} />}
              label="直接导出图谱"
              onClick={() => {
                const id = menuNovel.id;
                setMenuNovel(null);
                goEditor(id, { export: "open" });
              }}
            />
            <MenuRow
              icon={
                <IconTrash
                  className="w-4 h-4 text-vermillion"
                  strokeWidth={1.6}
                />
              }
              label="删除此卷"
              tone="danger"
              onClick={() => {
                setConfirmDelete(menuNovel);
                setMenuNovel(null);
              }}
            />
          </div>
        ) : null}
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

function ReaderMark({
  user,
  compact = false,
  onOpen,
}: {
  user: SessionUser;
  compact?: boolean;
  onOpen: () => void;
}) {
  const seal = readerSealChar(user);
  const short = readerShortLabel(user);

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="查看帐号"
        className="flex items-center gap-1.5 min-w-0 max-w-[9rem] sm:max-w-[12rem] px-1.5 py-1 -mx-1 rounded-[2px] bg-transparent appearance-none font-inherit transition-colors hover:bg-ink/5 active:bg-ink/8"
      >
        <Seal text={seal} size={22} rotate={-4} />
        <span className="hidden sm:inline text-[11px] tracking-editorial text-ink truncate">
          {short}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="查看帐号"
      className="flex items-center gap-2.5 min-w-0 max-w-[12rem] sm:max-w-[14rem] px-1.5 py-1 -mx-1.5 rounded-[2px] bg-transparent appearance-none font-inherit text-left transition-colors hover:bg-ink/5 active:bg-ink/8"
    >
      <Seal text={seal} size={28} rotate={-4} />
      <span className="font-song text-sm text-ink truncate leading-tight">
        {short}
      </span>
    </button>
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
      type="button"
      onClick={onClick}
      className={
        "w-full flex items-center gap-3 px-3 py-3.5 text-left text-sm rounded-[2px] bg-transparent appearance-none font-inherit transition-colors hover:bg-ink/5 " +
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
      {!hasQuery ? (
        <button type="button" onClick={onCreate} className="btn-primary mt-6">
          <IconPlus className="w-4 h-4 text-paper-soft" strokeWidth={1.8} />
          新开一卷
        </button>
      ) : null}
    </div>
  );
}
