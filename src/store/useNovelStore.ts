import { create } from "zustand";
import type {
  Character,
  CharacterInput,
  Novel,
  NovelInput,
  Relation,
  RelationInput,
  ThemeColor,
} from "@/types";
import { uid } from "@/lib/utils";
import {
  deleteNovelRemote,
  fetchAll,
  reconcileNovel,
} from "@/lib/novelRepo";
import { useAuthStore } from "@/store/useAuthStore";

interface DataState {
  novels: Novel[];
  characters: Character[];
  relations: Relation[];
}

interface NovelStore extends DataState {
  /** 云端数据加载状态 */
  hydrated: boolean;
  loadError: string | null;
  /** 启动时从云端全量加载 */
  hydrate: () => Promise<void>;

  createNovel: (input: NovelInput) => string;
  updateNovel: (id: string, patch: Partial<NovelInput>) => void;
  deleteNovel: (id: string) => void;
  duplicateNovel: (id: string) => string;
  getNovel: (id: string) => Novel | undefined;
  getCharacters: (novelId: string) => Character[];
  getRelations: (novelId: string) => Relation[];

  addCharacter: (novelId: string, input: CharacterInput) => string;
  updateCharacter: (
    novelId: string,
    id: string,
    patch: Partial<CharacterInput>,
  ) => void;
  updateCharacterPosition: (
    novelId: string,
    id: string,
    x: number,
    y: number,
  ) => void;
  removeCharacter: (novelId: string, id: string) => void;

  addRelation: (novelId: string, input: RelationInput) => string;
  updateRelation: (
    novelId: string,
    id: string,
    patch: Partial<RelationInput>,
  ) => void;
  removeRelation: (novelId: string, id: string) => void;

  setCharacters: (novelId: string, characters: Character[]) => void;
  snapshotNovel: (novelId: string) => {
    characters: Character[];
    relations: Relation[];
  };
  restoreNovel: (
    novelId: string,
    snapshot: { characters: Character[]; relations: Relation[] },
  ) => void;
}

function touch(novels: Novel[], id: string): Novel[] {
  return novels.map((n) => (n.id === id ? { ...n, updatedAt: Date.now() } : n));
}

// ---------- 写穿调度：按 novelId 去抖，合并拖拽等高频更新 ----------
const SYNC_DELAY = 500;
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useNovelStore = create<NovelStore>()((set, get) => {
  /** 立即把某本小说的当前状态对账到云端 */
  async function flushNovel(novelId: string): Promise<void> {
    if (!useAuthStore.getState().session) return;
    const s = get();
    const novel = s.novels.find((n) => n.id === novelId);
    if (!novel) return; // 已被删除，交由 deleteNovel 处理
    const characters = s.characters.filter((c) => c.novelId === novelId);
    const relations = s.relations.filter((r) => r.novelId === novelId);
    try {
      await reconcileNovel(novel, characters, relations);
    } catch (err) {
      console.error("[store] 同步小说到云端失败:", novelId, err);
    }
  }

  /** 去抖调度一次云端对账 */
  function scheduleSync(novelId: string): void {
    const prev = syncTimers.get(novelId);
    if (prev) clearTimeout(prev);
    syncTimers.set(
      novelId,
      setTimeout(() => {
        syncTimers.delete(novelId);
        void flushNovel(novelId);
      }, SYNC_DELAY),
    );
  }

  return {
    novels: [],
    characters: [],
    relations: [],
    hydrated: false,
    loadError: null,

    hydrate: async () => {
      // 未登录：无需加载云端数据
      if (!useAuthStore.getState().session) {
        set({
          novels: [],
          characters: [],
          relations: [],
          hydrated: true,
          loadError: null,
        });
        return;
      }
      try {
        const userId = useAuthStore.getState().user?.uid;
        if (!userId) {
          set({ hydrated: true, loadError: "未找到用户信息" });
          return;
        }
        const data = await fetchAll(userId);
        set({
          novels: data.novels,
          characters: data.characters,
          relations: data.relations,
          hydrated: true,
          loadError: null,
        });
      } catch (err) {
        console.error("[store] 从云端加载数据失败:", err);
        set({
          hydrated: true,
          loadError:
            err instanceof Error ? err.message : "加载云端数据失败",
        });
      }
    },

    createNovel: (input) => {
      const authUser = useAuthStore.getState().user;
      if (!authUser) {
        console.error("[store] createNovel 需要已登录用户");
        return "";
      }
      const now = Date.now();
      const id = uid("novel");
      const novel: Novel = {
        id,
        userId: authUser.uid,
        title: input.title.trim() || "未命名",
        author: (input.author ?? "").trim(),
        synopsis: (input.synopsis ?? "").trim(),
        themeColor: input.themeColor ?? "vermillion",
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ novels: [novel, ...s.novels] }));
      scheduleSync(id);
      return id;
    },

    updateNovel: (id, patch) => {
      set((s) => ({
        novels: s.novels.map((n) =>
          n.id === id
            ? {
                ...n,
                ...patch,
                title: patch.title ? patch.title.trim() || n.title : n.title,
                updatedAt: Date.now(),
              }
            : n,
        ),
      }));
      scheduleSync(id);
    },

    deleteNovel: (id) => {
      set((s) => ({
        novels: s.novels.filter((n) => n.id !== id),
        characters: s.characters.filter((c) => c.novelId !== id),
        relations: s.relations.filter((r) => r.novelId !== id),
      }));
      const t = syncTimers.get(id);
      if (t) {
        clearTimeout(t);
        syncTimers.delete(id);
      }
      void (async () => {
        if (!useAuthStore.getState().session) return;
        try {
          await deleteNovelRemote(id);
        } catch (err) {
          console.error("[store] 云端删除小说失败:", id, err);
        }
      })();
    },

    duplicateNovel: (id) => {
      const state = get();
      const novel = state.novels.find((n) => n.id === id);
      if (!novel) return id;
      const now = Date.now();
      const newId = uid("novel");
      const userId = useAuthStore.getState().user?.uid ?? novel.userId;
      const newNovel: Novel = {
        ...novel,
        id: newId,
        userId,
        title: `${novel.title} · 副本`,
        createdAt: now,
        updatedAt: now,
      };
      const chars = state.characters.filter((c) => c.novelId === id);
      const idMap = new Map<string, string>();
      const newChars = chars.map((c) => {
        const newCid = uid("char");
        idMap.set(c.id, newCid);
        return {
          ...c,
          id: newCid,
          novelId: newId,
          createdAt: now,
        };
      });
      const rels = state.relations.filter((r) => r.novelId === id);
      const newRels = rels
        .filter((r) => idMap.has(r.sourceId) && idMap.has(r.targetId))
        .map((r) => ({
          ...r,
          id: uid("rel"),
          novelId: newId,
          sourceId: idMap.get(r.sourceId)!,
          targetId: idMap.get(r.targetId)!,
          createdAt: now,
        }));
      set((s) => ({
        novels: [newNovel, ...s.novels],
        characters: [...s.characters, ...newChars],
        relations: [...s.relations, ...newRels],
      }));
      scheduleSync(newId);
      return newId;
    },

    getNovel: (id) => get().novels.find((n) => n.id === id),
    getCharacters: (novelId) =>
      get().characters.filter((c) => c.novelId === novelId),
    getRelations: (novelId) =>
      get().relations.filter((r) => r.novelId === novelId),

    addCharacter: (novelId, input) => {
      const id = uid("char");
      const now = Date.now();
      const character: Character = {
        id,
        novelId,
        name: input.name.trim() || "无名氏",
        alias: input.alias?.trim() || undefined,
        role: input.role,
        faction: input.faction,
        color: input.color,
        note: input.note,
        x: input.x,
        y: input.y,
        createdAt: now,
      };
      set((s) => ({
        characters: [...s.characters, character],
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
      return id;
    },

    updateCharacter: (novelId, id, patch) => {
      set((s) => ({
        characters: s.characters.map((c) =>
          c.id === id && c.novelId === novelId ? { ...c, ...patch } : c,
        ),
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
    },

    updateCharacterPosition: (novelId, id, x, y) => {
      set((s) => ({
        characters: s.characters.map((c) =>
          c.id === id && c.novelId === novelId ? { ...c, x, y } : c,
        ),
        novels: touch(s.novels, novelId),
      }));
      // 高频热路径：去抖合并，拖拽结束后统一写入一次
      scheduleSync(novelId);
    },

    removeCharacter: (novelId, id) => {
      set((s) => ({
        characters: s.characters.filter(
          (c) => !(c.id === id && c.novelId === novelId),
        ),
        relations: s.relations.filter(
          (r) =>
            !(
              r.novelId === novelId &&
              (r.sourceId === id || r.targetId === id)
            ),
        ),
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
    },

    addRelation: (novelId, input) => {
      const id = uid("rel");
      const now = Date.now();
      const relation: Relation = {
        id,
        novelId,
        sourceId: input.sourceId,
        targetId: input.targetId,
        type: input.type,
        direction: input.direction,
        note: input.note,
        createdAt: now,
      };
      set((s) => ({
        relations: [...s.relations, relation],
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
      return id;
    },

    updateRelation: (novelId, id, patch) => {
      set((s) => ({
        relations: s.relations.map((r) =>
          r.id === id && r.novelId === novelId ? { ...r, ...patch } : r,
        ),
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
    },

    removeRelation: (novelId, id) => {
      set((s) => ({
        relations: s.relations.filter(
          (r) => !(r.id === id && r.novelId === novelId),
        ),
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
    },

    setCharacters: (novelId, characters) => {
      set((s) => {
        const patchMap = new Map(characters.map((c) => [c.id, c]));
        return {
          characters: s.characters.map((c) =>
            c.novelId === novelId && patchMap.has(c.id)
              ? { ...c, x: patchMap.get(c.id)!.x, y: patchMap.get(c.id)!.y }
              : c,
          ),
          novels: touch(s.novels, novelId),
        };
      });
      scheduleSync(novelId);
    },

    snapshotNovel: (novelId) => {
      const s = get();
      const chars = s.characters
        .filter((c) => c.novelId === novelId)
        .map((c) => ({ ...c }));
      const rels = s.relations
        .filter((r) => r.novelId === novelId)
        .map((r) => ({ ...r }));
      return { characters: chars, relations: rels };
    },

    restoreNovel: (novelId, snapshot) => {
      set((s) => ({
        characters: [
          ...s.characters.filter((c) => c.novelId !== novelId),
          ...snapshot.characters.map((c) => ({ ...c, novelId })),
        ],
        relations: [
          ...s.relations.filter((r) => r.novelId !== novelId),
          ...snapshot.relations.map((r) => ({ ...r, novelId })),
        ],
        novels: touch(s.novels, novelId),
      }));
      scheduleSync(novelId);
    },
  };
});

export function getStats(
  novels: Novel[],
  characters: Character[],
  relations: Relation[],
) {
  return {
    novelCount: novels.length,
    characterCount: characters.length,
    relationCount: relations.length,
  };
}

export const DEFAULT_NOVEL_THEME: ThemeColor = "vermillion";
