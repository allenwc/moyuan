import type { Character, Relation, Viewport } from "@/types";

export interface CanvasProps {
  characters: Character[];
  relations: Relation[];
  viewport: Viewport;
  focusedCharacterId: string | null;
  selectedRelationId: string | null;
  connectingFromId: string | null;
  onViewportChange: (vp: Viewport | ((prev: Viewport) => Viewport)) => void;
  onFocusCharacter: (id: string | null) => void;
  onEditCharacter: (id: string) => void;
  onSelectRelation: (id: string | null) => void;
  onStartConnect: (id: string) => void;
  onCompleteConnect: (sourceId: string, targetId: string) => void;
  onCancelConnect: () => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onCommitPosition: (id: string, x: number, y: number) => void;
  onAddCharacterAt: (x: number, y: number) => void;
  clampScale: (s: number) => number;
  relationGuideOpen?: boolean;
  onDismissRelationGuide?: () => void;
}
