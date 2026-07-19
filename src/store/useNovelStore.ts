import { create } from "zustand";
import { persist } from "zustand/middleware";
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

interface PersistedState {
  novels: Novel[];
  characters: Character[];
  relations: Relation[];
}

interface NovelStore extends PersistedState {
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
  snapshotNovel: (novelId: string) => { characters: Character[]; relations: Relation[] };
  restoreNovel: (novelId: string, snapshot: { characters: Character[]; relations: Relation[] }) => void;
}

function touch(novels: Novel[], id: string): Novel[] {
  return novels.map((n) =>
    n.id === id ? { ...n, updatedAt: Date.now() } : n,
  );
}

export const useNovelStore = create<NovelStore>()(
  persist(
    (set, get) => ({
      novels: [],
      characters: [],
      relations: [],

      createNovel: (input) => {
        const now = Date.now();
        const id = uid("novel");
        const novel: Novel = {
          id,
          title: input.title.trim() || "未命名",
          author: input.author.trim(),
          synopsis: input.synopsis.trim(),
          themeColor: input.themeColor,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ novels: [novel, ...s.novels] }));
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
      },

      deleteNovel: (id) => {
        set((s) => ({
          novels: s.novels.filter((n) => n.id !== id),
          characters: s.characters.filter((c) => c.novelId !== id),
          relations: s.relations.filter((r) => r.novelId !== id),
        }));
      },

      duplicateNovel: (id) => {
        const state = get();
        const novel = state.novels.find((n) => n.id === id);
        if (!novel) return id;
        const now = Date.now();
        const newId = uid("novel");
        const newNovel: Novel = {
          ...novel,
          id: newId,
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
        return id;
      },

      updateCharacter: (novelId, id, patch) => {
        set((s) => ({
          characters: s.characters.map((c) =>
            c.id === id && c.novelId === novelId ? { ...c, ...patch } : c,
          ),
          novels: touch(s.novels, novelId),
        }));
      },

      updateCharacterPosition: (novelId, id, x, y) => {
        set((s) => ({
          characters: s.characters.map((c) =>
            c.id === id && c.novelId === novelId ? { ...c, x, y } : c,
          ),
          novels: touch(s.novels, novelId),
        }));
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
        return id;
      },

      updateRelation: (novelId, id, patch) => {
        set((s) => ({
          relations: s.relations.map((r) =>
            r.id === id && r.novelId === novelId ? { ...r, ...patch } : r,
          ),
          novels: touch(s.novels, novelId),
        }));
      },

      removeRelation: (novelId, id) => {
        set((s) => ({
          relations: s.relations.filter(
            (r) => !(r.id === id && r.novelId === novelId),
          ),
          novels: touch(s.novels, novelId),
        }));
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
      },
    }),
    {
      name: "moyuan:novels",
      version: 1,
    },
  ),
);

export function getStats(novels: Novel[], characters: Character[], relations: Relation[]) {
  return {
    novelCount: novels.length,
    characterCount: characters.length,
    relationCount: relations.length,
  };
}

export const DEFAULT_NOVEL_THEME: ThemeColor = "vermillion";
