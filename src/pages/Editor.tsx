import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useNovelStore } from "@/store/useNovelStore";
import { autoArrange, computeBounds } from "@/lib/layout";
import { clamp } from "@/lib/utils";
import type { Character, CharacterInput, Relation, Viewport } from "@/types";
import { Toolbar } from "@/components/editor/Toolbar";
import { Canvas } from "@/components/editor/Canvas";
import { MiniMap } from "@/components/editor/MiniMap";
import { Fab } from "@/components/editor/Fab";
import { CharacterPanel } from "@/components/editor/CharacterPanel";
import { RelationPanel } from "@/components/editor/RelationPanel";
import { AddCharacterSheet } from "@/components/editor/AddCharacterSheet";
import { ExportStudio } from "@/components/editor/ExportStudio";

type Snapshot = { characters: Character[]; relations: Relation[] };

export default function Editor() {
  const { novelId = "" } = useParams<{ novelId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addPosition, setAddPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [exportOpen, setExportOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const skipHistoryRef = useRef(false);

  // Auto-fit viewport when entering editor or when characters initially load
  const didInitialFit = useRef(false);
  useEffect(() => {
    if (!novel || didInitialFit.current) return;
    if (characters.length === 0) {
      // center the canvas at origin
      setViewport({ scale: 1, x: window.innerWidth / 2, y: window.innerHeight / 2 });
      didInitialFit.current = true;
      return;
    }
    const bounds = computeBounds(characters, 100);
    const w = window.innerWidth;
    const h = window.innerHeight;
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
    if (searchParams.get("export") === "open") {
      setExportOpen(true);
      searchParams.delete("export");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Redirect if novel doesn't exist
  useEffect(() => {
    if (!novel && novelId) {
      const t = setTimeout(() => navigate("/"), 100);
      return () => clearTimeout(t);
    }
  }, [novel, novelId, navigate]);

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
    setSelectedCharacterId(null);
  };

  // ===== Relation operations =====
  const handleStartConnect = (id: string) => {
    setConnectingFromId(id);
    setSelectedCharacterId(null);
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
      width: window.innerWidth,
      height: window.innerHeight - 160,
    });
    setCharacters(novelId, arranged);
    // fit view
    const bounds = computeBounds(arranged, 80);
    const w = window.innerWidth;
    const h = window.innerHeight;
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
      setViewport({ scale: 1, x: window.innerWidth / 2, y: window.innerHeight / 2 });
      return;
    }
    const bounds = computeBounds(characters, 80);
    const w = window.innerWidth;
    const h = window.innerHeight;
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
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const newScale = clamp(viewport.scale * factor, 0.25, 3);
    const k = newScale / viewport.scale;
    const nx = cx - (cx - viewport.x) * k;
    const ny = cy - (cy - viewport.y) * k;
    setViewport({ scale: newScale, x: nx, y: ny });
  };

  const handleMinimapJump = (worldX: number, worldY: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setViewport((vp) => ({
      ...vp,
      x: w / 2 - worldX * vp.scale,
      y: h / 2 - worldY * vp.scale,
    }));
  };

  const clampScale = (s: number) => clamp(s, 0.25, 3);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null;
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
        selectedCharacterId={selectedCharacterId}
        selectedRelationId={selectedRelationId}
        connectingFromId={connectingFromId}
        onViewportChange={setViewport}
        onSelectCharacter={(id) => {
          setSelectedCharacterId(id);
          if (id) setSelectedRelationId(null);
        }}
        onSelectRelation={(id) => {
          setSelectedRelationId(id);
          if (id) setSelectedCharacterId(null);
        }}
        onStartConnect={handleStartConnect}
        onCompleteConnect={handleCompleteConnect}
        onCancelConnect={handleCancelConnect}
        onUpdatePosition={handleUpdateCharacterPosition}
        onCommitPosition={handleCommitPosition}
        onAddCharacterAt={handleAddCharacterAt}
        clampScale={clampScale}
      />

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

      <MiniMap
        characters={characters}
        viewport={viewport}
        canvasWidth={window.innerWidth}
        canvasHeight={window.innerHeight}
        onJump={handleMinimapJump}
      />

      <Fab
        onAddCharacter={() => {
          const cx = (window.innerWidth / 2 - viewport.x) / viewport.scale;
          const cy = (window.innerHeight / 2 - viewport.y) / viewport.scale;
          handleAddCharacterAt(cx, cy);
        }}
        onAddRelation={() => {
          if (characters.length < 2) return;
          // start connect mode from the most recently added character
          setConnectingFromId(characters[characters.length - 1].id);
        }}
        onAutoLayout={handleAutoLayout}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onFitView={fitView}
      />

      {/* Character panel */}
      <CharacterPanel
        open={!!selectedCharacter}
        character={selectedCharacter}
        relations={relations}
        characters={characters}
        onClose={() => setSelectedCharacterId(null)}
        onSave={handleUpdateCharacter}
        onDelete={handleDeleteCharacter}
        onSelectRelation={(id) => {
          setSelectedCharacterId(null);
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

      {/* status footer */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),0.6rem)] left-4 z-20 pointer-events-none">
        <div className="flex items-center gap-2 text-[10px] text-ink-mute tracking-editorial bg-paper-soft/70 backdrop-blur-sm px-2.5 py-1 rounded-[2px] border border-ink/8">
          <span>{characters.length} 人</span>
          <span className="divider-dot" />
          <span>{relations.length} 缘</span>
          <span className="divider-dot" />
          <span>{Math.round(viewport.scale * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
