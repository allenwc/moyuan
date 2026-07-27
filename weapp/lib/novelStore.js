const { fetchAll, reconcileNovel, deleteNovelRemote, uid } = require("./novelRepo");
const { currentUser } = require("./auth");

const state = {
  novels: [],
  characters: [],
  relations: [],
  hydrated: false,
  loadError: "",
};

const listeners = new Set();
const syncTimers = new Map();

function getState() {
  return state;
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  });
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function hydrate() {
  const user = currentUser();
  if (!user || !user.uid) {
    state.loadError = "未登录";
    notify();
    return;
  }
  state.loadError = "";
  try {
    const snap = await fetchAll("{{uid}}");
    state.novels = snap.novels || [];
    state.characters = snap.characters || [];
    state.relations = snap.relations || [];
    state.hydrated = true;
    notify();
  } catch (err) {
    state.loadError = (err && err.message) || "加载失败";
    state.hydrated = true;
    notify();
    throw err;
  }
}

function scheduleSync(novelId) {
  const prev = syncTimers.get(novelId);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    syncTimers.delete(novelId);
    void flushNovel(novelId);
  }, 600);
  syncTimers.set(novelId, t);
}

async function flushNovel(novelId) {
  const novel = state.novels.find((n) => n.id === novelId);
  if (!novel) return;
  const characters = state.characters.filter((c) => c.novelId === novelId);
  const relations = state.relations.filter((r) => r.novelId === novelId);
  await reconcileNovel(novel, characters, relations);
}

function createNovel(input) {
  const user = currentUser();
  if (!user) return "";
  const now = Date.now();
  const id = uid("novel");
  const novel = {
    id,
    userId: "{{uid}}",
    title: (input.title || "").trim() || "未命名",
    author: (input.author || "").trim(),
    synopsis: (input.synopsis || "").trim(),
    themeColor: input.themeColor || "vermillion",
    createdAt: now,
    updatedAt: now,
  };
  state.novels = [novel, ...state.novels];
  notify();
  scheduleSync(id);
  return id;
}

function updateNovel(id, patch) {
  state.novels = state.novels.map((n) =>
    n.id === id
      ? {
          ...n,
          ...patch,
          title: patch.title != null ? patch.title.trim() || n.title : n.title,
          updatedAt: Date.now(),
        }
      : n,
  );
  notify();
  scheduleSync(id);
}

function deleteNovel(id) {
  state.novels = state.novels.filter((n) => n.id !== id);
  state.characters = state.characters.filter((c) => c.novelId !== id);
  state.relations = state.relations.filter((r) => r.novelId !== id);
  const t = syncTimers.get(id);
  if (t) {
    clearTimeout(t);
    syncTimers.delete(id);
  }
  notify();
  void deleteNovelRemote(id).catch((err) =>
    console.error("[store] 云端删除失败", id, err),
  );
}

function duplicateNovel(id) {
  const novel = state.novels.find((n) => n.id === id);
  if (!novel) return id;
  const user = currentUser();
  const now = Date.now();
  const newId = uid("novel");
  const newNovel = {
    ...novel,
    id: newId,
    userId: (user && user.uid) || novel.userId,
    title: `${novel.title} · 副本`,
    createdAt: now,
    updatedAt: now,
  };
  const chars = state.characters.filter((c) => c.novelId === id);
  const idMap = new Map();
  const newChars = chars.map((c) => {
    const nid = uid("char");
    idMap.set(c.id, nid);
    return { ...c, id: nid, novelId: newId, createdAt: now };
  });
  const newRels = state.relations
    .filter((r) => r.novelId === id)
    .map((r) => ({
      ...r,
      id: uid("rel"),
      novelId: newId,
      sourceId: idMap.get(r.sourceId) || r.sourceId,
      targetId: idMap.get(r.targetId) || r.targetId,
      createdAt: now,
    }));
  state.novels = [newNovel, ...state.novels];
  state.characters = [...newChars, ...state.characters];
  state.relations = [...newRels, ...state.relations];
  notify();
  scheduleSync(newId);
  return newId;
}

function getNovel(id) {
  return state.novels.find((n) => n.id === id);
}

function getCharacters(novelId) {
  return state.characters.filter((c) => c.novelId === novelId);
}

function getRelations(novelId) {
  return state.relations.filter((r) => r.novelId === novelId);
}

function setGraph(novelId, characters, relations) {
  state.characters = [
    ...state.characters.filter((c) => c.novelId !== novelId),
    ...characters,
  ];
  state.relations = [
    ...state.relations.filter((r) => r.novelId !== novelId),
    ...relations,
  ];
  state.novels = state.novels.map((n) =>
    n.id === novelId ? { ...n, updatedAt: Date.now() } : n,
  );
  notify();
}

function touchNovel(novelId) {
  scheduleSync(novelId);
}

module.exports = {
  getState,
  subscribe,
  hydrate,
  createNovel,
  updateNovel,
  deleteNovel,
  duplicateNovel,
  getNovel,
  getCharacters,
  getRelations,
  setGraph,
  touchNovel,
  flushNovel,
  uid,
};
