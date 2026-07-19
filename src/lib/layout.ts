import type { Character, Relation } from "@/types";

export interface LayoutOptions {
  iterations?: number;
  idealDistance?: number;
  repulsion?: number;
  attraction?: number;
  centerX?: number;
  centerY?: number;
  gravity?: number;
  maxStep?: number;
}

export function forceLayout(
  characters: Character[],
  relations: Relation[],
  options: LayoutOptions = {},
): Character[] {
  const {
    iterations = 220,
    idealDistance = 180,
    repulsion = 22000,
    attraction = 0.04,
    centerX = 0,
    centerY = 0,
    gravity = 0.02,
    maxStep = 24,
  } = options;

  if (characters.length === 0) return [];

  const nodes = characters.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    vx: 0,
    vy: 0,
  }));

  const edges = relations
    .map((r) => ({
      source: r.sourceId,
      target: r.targetId,
    }))
    .filter((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter += 1) {
    const temperature = 1 - iter / iterations;

    let i = 0;
    for (const a of nodes) {
      let j = 0;
      for (const b of nodes) {
        if (i <= j) {
          j += 1;
          continue;
        }
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
        j += 1;
      }
      i += 1;
    }

    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy + 0.01) ;
      const diff = dist - idealDistance;
      const force = attraction * diff;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    for (const n of nodes) {
      const dx = centerX - n.x;
      const dy = centerY - n.y;
      n.vx += dx * gravity;
      n.vy += dy * gravity;

      const stepX = Math.max(-maxStep, Math.min(maxStep, n.vx * temperature));
      const stepY = Math.max(-maxStep, Math.min(maxStep, n.vy * temperature));
      n.x += stepX;
      n.y += stepY;
      n.vx *= 0.6;
      n.vy *= 0.6;
    }
  }

  const map = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  return characters.map((c) => {
    const p = map.get(c.id);
    return p ? { ...c, x: p.x, y: p.y } : c;
  });
}

export function autoArrange(
  characters: Character[],
  relations: Relation[],
  options: { width: number; height: number; seed?: boolean } = {
    width: window.innerWidth,
    height: window.innerHeight,
  },
): Character[] {
  if (characters.length === 0) return [];

  const seed = options.seed ?? true;
  const init = seed
    ? characters.map((c, i) => {
        if (c.x !== 0 || c.y !== 0) return c;
        const angle = (i / Math.max(1, characters.length)) * Math.PI * 2;
        const radius = Math.min(options.width, options.height) * 0.28;
        return {
          ...c,
          x: Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
          y: Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        };
      })
    : characters;

  return forceLayout(init, relations, {
    centerX: 0,
    centerY: 0,
    idealDistance: 170,
    iterations: 260,
  });
}

export function computeBounds(
  characters: Character[],
  padding = 80,
): { x: number; y: number; width: number; height: number } {
  if (characters.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of characters) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
