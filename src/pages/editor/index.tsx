import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useDidShow } from "@tarojs/taro";
import { useNovelStore } from "@/store/useNovelStore";
import { useAuthStore } from "@/store/useAuthStore";
import { autoArrange, computeBounds } from "@/lib/layout";
import { clamp } from "@/lib/utils";
import { getScreenSize } from "@/lib/screen";
import { goLibrary, goLogin } from "@/lib/nav";
import type { Character, CharacterInput, Relation, Viewport } from "@/types";
import { Toolbar } from "@/components/editor/Toolbar";
import { Canvas } from "@/components/editor/Canvas";
import { ZoomControls } from "@/components/editor/ZoomControls";
import { Fab } from "@/components/editor/Fab";
import { FocusPeek } from "@/components/editor/FocusPeek";
import { CharacterPanel } from "@/components/editor/CharacterPanel";
import { RelationPanel } from "@/components/editor/RelationPanel";
import { AddCharacterSheet } from "@/components/editor/AddCharacterSheet";
import { ExportStudio } from "@/components/editor/ExportStudio";

type Snapshot = { characters: Character[]; relations: Relation[] };

export default function Editor() {
  const router = useRouter();
  const novelId = (router.params.novelId as string) || "";
  const exportFlag = router.params.export;

  const authReady = useAuthStore((s) => s.ready);
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.init);
  const hydrated = useNovelStore((s) => s.hydrated);
  const hydrate = useNovelStore((s) => s.hydrate);

  const novel = useNovelStore((s) => s.novels.find((n) => n.id === novelId));
  const allCharacters = useNovelStore((s) => s.characters);
  const allRelations = useNovelStore((s) => s.relations);

  const addCharacter = useNovelStore((s) => s.addCharacter);
  const updateCharacter = useNovelStore((s) => s.updateCharacter);
  const updateCharacterPosition = useNovelStore((s) => s.updateCharacterPosition);
  const removeCharacter = useNovelStore((s) => s.removeCharacter);
  const addRelation = useNovelStore((s) => s.addRelation);
  const updateRelation = useNovelStore((s) => s.updateRelation);
  const removeRelation = useNovelStore((s) => s.removeRelation);
  const setCharacters = useNovelStore((s) => s.setCharacters);
  const snapshotNovel = useNovelStore((s) => s.snapshotNovel);
  const restoreNovel = useNovelStore((s) => s.restoreNovel);

  const characters = useMemo(
    () => allCharacters.filter((c) => c.novelId === novelId),
    [allCharacters, novelId],
  );
  const relations = useMemo(
    () => allRelations.filter((r) => r.novelId === novelId),
    [allRelations, novelId],
  );

  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [focusedCharacterId, setFocusedCharacterId] = useState<string | null>(null);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addPosition, setAddPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [exportOpen, setExportOpen] = useState(false);
  const [relationGuideOpen, setRelationGuideOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const skipHistoryRef = useRef(false);

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

  // Auto-fit viewport when entering editor or when characters initially load
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!novel || didInitialFit.current) return;
    if (characters.length === 0) {
      // center the canvas at origin
      setViewport({ scale: 1, x: getScreenSize().width / 2, y: getScreenSize().height / 2 });
      didInitialFit.current = true;
      return;
    }
    const bounds = computeBounds(characters, 100);
    const w = getScreenSize().width;
    const h = getScreenSize().height;
    const scale = clamp(
      Math.min((w - 60) / bounds.width, (h - 200) / bounds.height, 1.4),
      0.3,
      1.5,
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    setViewport({ scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale });
    didInitialFit.current = true;
  }, [novel, characters]);

  // Saving indicator - shows briefly when the novel is updated
  const updatedAt = novel?.updatedAt;
  const lastSavedAtRef = useRef<number>(updatedAt ?? 0);
  useEffect(() => {
    if (!updatedAt) return;
    if (updatedAt === lastSavedAtRef.current) return;
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 900);
    lastSavedAtRef.current = updatedAt;
    return () => clearTimeout(t);
  }, [updatedAt]);

  // Auto-open export when ?export=open is present
  useEffect(() => {
    if (exportFlag === "open") {
      setExportOpen(true);
    }
  }, [exportFlag]);

  // Redirect if novel doesn't exist
  useEffect(() => {
    if (!novel && novelId) {
      const t = setTimeout(() => goLibrary(), 100);
      return () => clearTimeout(t);
    }
  }, [novel, novelId]);

  // ===== History helpers =====
  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const snap = snapshotNovel(novelId);
    setUndoStack((stack) => [...stack.slice(-49), snap]);
    setRedoStack([]);
  }, [novelId, snapshotNovel]);

  const performUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      const current = snapshotNovel(novelId);
      setRedoStack((redo) => [...redo, current]);
      skipHistoryRef.current = true;
      restoreNovel(novelId, prev);
      return stack.slice(0, -1);
    });
  }, [novelId, snapshotNovel, restoreNovel]);

  const performRedo = useCallback(() => {
    setRedoStack((redo) => {
      if (redo.length === 0) return redo;
      const next = redo[redo.length - 1];
      const current = snapshotNovel(novelId);
      setUndoStack((stack) => [...stack.slice(-49), current]);
      skipHistoryRef.current = true;
      restoreNovel(novelId, next);
      return redo.slice(0, -1);
    });
  }, [novelId, snapshotNovel, restoreNovel]);

  // ===== Character operations =====
  const handleAddCharacterAt = useCallback(
    (x: number, y: number) => {
      setAddPosition({ x, y });
      setAddSheetOpen(true);
    },
    [],
  );

  const handleCreateCharacter = (input: CharacterInput) => {
    pushHistory();
    addCharacter(novelId, input);
  };

  const handleUpdateCharacter = (id: string, patch: Partial<Character>) => {
    pushHistory();
    updateCharacter(novelId, id, patch);
  };

  const handleUpdateCharacterPosition = (id: string, x: number, y: number) => {
    updateCharacterPosition(novelId, id, x, y);
  };

  const handleCommitPosition = () => {
    // The drag already updated positions live; commit a snapshot to history
    pushHistory();
  };

  const handleDeleteCharacter = (id: string) => {
    pushHistory();
    removeCharacter(novelId, id);
    setFocusedCharacterId(null);
    setEditingCharacterId(null);
  };

  const handleFocusCharacter = useCallback((id: string | null) => {
    setFocusedCharacterId(id);
    if (id) {
      setSelectedRelationId(null);
      setEditingCharacterId(null);
    } else {
      setEditingCharacterId(null);
    }
  }, []);

  const handleEditCharacter = useCallback((id: string) => {
    setFocusedCharacterId(id);
    setEditingCharacterId(id);
    setSelectedRelationId(null);
  }, []);

  // ===== Relation operations =====
  const handleStartConnect = (id: string) => {
    setConnectingFromId(id);
    setRelationGuideOpen(false);
    setFocusedCharacterId(null);
    setEditingCharacterId(null);
    setSelectedRelationId(null);
  };

  const handleCompleteConnect = (sourceId: string, targetId: string) => {
    pushHistory();
    addRelation(novelId, {
      sourceId,
      targetId,
      type: "other",
      direction: "one-way",
      note: "",
    });
    const newId = useNovelStore.getState().relations.slice(-1)[0]?.id;
    setConnectingFromId(null);
    if (newId) setSelectedRelationId(newId);
  };

  const handleCancelConnect = () => setConnectingFromId(null);

  const handleUpdateRelation = (id: string, patch: Partial<Relation>) => {
    pushHistory();
    updateRelation(novelId, id, patch);
  };

  const handleDeleteRelation = (id: string) => {
    pushHistory();
    removeRelation(novelId, id);
    setSelectedRelationId(null);
  };

  // ===== Layout / view =====
  const handleAutoLayout = useCallback(() => {
    pushHistory();
    const arranged = autoArrange(characters, relations, {
      width: getScreenSize().width,
      height: getScreenSize().height - 160,
    });
    setCharacters(novelId, arranged);
    // fit view
    const bounds = computeBounds(arranged, 80);
    const w = getScreenSize().width;
    const h = getScreenSize().height;
    const scale = clamp(
      Math.min((w - 80) / Math.max(bounds.width, 1), (h - 240) / Math.max(bounds.height, 1), 1.2),
      0.3,
      1.4,
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    setViewport({ scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale });
  }, [characters, relations, novelId, setCharacters, pushHistory]);

  const fitView = useCallback(() => {
    if (characters.length === 0) {
      setViewport({ scale: 1, x: getScreenSize().width / 2, y: getScreenSize().height / 2 });
      return;
    }
    const bounds = computeBounds(characters, 80);
    const w = getScreenSize().width;
    const h = getScreenSize().height;
    const scale = clamp(
      Math.min((w - 80) / Math.max(bounds.width, 1), (h - 240) / Math.max(bounds.height, 1), 1.2),
      0.3,
      1.4,
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    setViewport({ scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale });
  }, [characters]);

  const zoomBy = (factor: number) => {
    const cx = getScreenSize().width / 2;
    const cy = getScreenSize().height / 2;
    setViewport((vp) => {
      const newScale = clamp(vp.scale * factor, 0.25, 3);
      const k = newScale / vp.scale;
      return {
        scale: newScale,
        x: cx - (cx - vp.x) * k,
        y: cy - (cy - vp.y) * k,
      };
    });
  };

  const clampScale = (s: number) => clamp(s, 0.25, 3);

  const focusedCharacter =
    characters.find((c) => c.id === focusedCharacterId) ?? null;
  const editingCharacter =
    characters.find((c) => c.id === editingCharacterId) ?? null;
  const focusedRelationCount = focusedCharacter
    ? relations.filter(
        (r) =>
          r.sourceId === focusedCharacter.id || r.targetId === focusedCharacter.id,
      ).length
    : 0;
  const selectedRelation = relations.find((r) => r.id === selectedRelationId) ?? null;
  const relSource = selectedRelation
    ? characters.find((c) => c.id === selectedRelation.sourceId) ?? null
    : null;
  const relTarget = selectedRelation
    ? characters.find((c) => c.id === selectedRelation.targetId) ?? null
    : null;

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-mute">
        <p className="font-song">卷宗未寻得，正在返回图书馆…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-paper">
      <Canvas
        characters={characters}
        relations={relations}
        viewport={viewport}
        focusedCharacterId={focusedCharacterId}
        selectedRelationId={selectedRelationId}
        connectingFromId={connectingFromId}
        onViewportChange={setViewport}
        onFocusCharacter={handleFocusCharacter}
        onEditCharacter={handleEditCharacter}
        onSelectRelation={(id) => {
          setSelectedRelationId(id);
          if (id) {
            setFocusedCharacterId(null);
            setEditingCharacterId(null);
          }
        }}
        onStartConnect={handleStartConnect}
        onCompleteConnect={handleCompleteConnect}
        onCancelConnect={handleCancelConnect}
        onUpdatePosition={handleUpdateCharacterPosition}
        onCommitPosition={handleCommitPosition}
        onAddCharacterAt={handleAddCharacterAt}
        clampScale={clampScale}
        relationGuideOpen={relationGuideOpen && !connectingFromId}
        onDismissRelationGuide={() => setRelationGuideOpen(false)}
      />

      <div className="absolute top-0 left-0 right-0 z-30 safe-top">
        <Toolbar
          title={novel.title}
          subtitle={novel.author || "佚名"}
          saving={saving}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={performUndo}
          onRedo={performRedo}
          onExport={() => setExportOpen(true)}
          onAutoLayout={handleAutoLayout}
        />
        {focusedCharacter && !editingCharacter && !connectingFromId && (
          <FocusPeek
            key={focusedCharacter.id}
            character={focusedCharacter}
            relationCount={focusedRelationCount}
            onEdit={() => handleEditCharacter(focusedCharacter.id)}
            onDismiss={() => handleFocusCharacter(null)}
          />
        )}
      </div>

      <ZoomControls
        characterCount={characters.length}
        relationCount={relations.length}
        scalePercent={Math.round(viewport.scale * 100)}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onFitView={fitView}
        onAutoLayout={handleAutoLayout}
      />

      <Fab
        onAddCharacter={() => {
          const cx = (getScreenSize().width / 2 - viewport.x) / viewport.scale;
          const cy = (getScreenSize().height / 2 - viewport.y) / viewport.scale;
          handleAddCharacterAt(cx, cy);
        }}
        onAddRelation={() => setRelationGuideOpen(true)}
      />

      {/* Character panel */}
      <CharacterPanel
        open={!!editingCharacter}
        character={editingCharacter}
        relations={relations}
        characters={characters}
        onClose={() => setEditingCharacterId(null)}
        onSave={handleUpdateCharacter}
        onDelete={handleDeleteCharacter}
        onSelectRelation={(id) => {
          setEditingCharacterId(null);
          setFocusedCharacterId(null);
          setSelectedRelationId(id);
        }}
      />

      {/* Relation panel */}
      <RelationPanel
        open={!!selectedRelation}
        relation={selectedRelation}
        source={relSource}
        target={relTarget}
        onClose={() => setSelectedRelationId(null)}
        onSave={handleUpdateRelation}
        onDelete={handleDeleteRelation}
      />

      {/* Add character sheet */}
      <AddCharacterSheet
        open={addSheetOpen}
        initialPosition={addPosition}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleCreateCharacter}
      />

      {/* Export */}
      <ExportStudio
        open={exportOpen}
        novel={novel}
        characters={characters}
        relations={relations}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
