function forceLayout(characters, relations, options) {
  const {
    iterations = 220,
    idealDistance = 180,
    repulsion = 22000,
    attraction = 0.04,
    centerX = 0,
    centerY = 0,
    gravity = 0.02,
    maxStep = 24,
  } = options || {};

  if (!characters.length) return [];

  const nodes = characters.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    vx: 0,
    vy: 0,
  }));

  const edges = relations
    .map((r) => ({ source: r.sourceId, target: r.targetId }))
    .filter(
      (e) =>
        nodes.some((n) => n.id === e.source) &&
        nodes.some((n) => n.id === e.target),
    );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter += 1) {
    const temperature = 1 - iter / iterations;

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
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
      }
    }

    edges.forEach((e) => {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
      const diff = dist - idealDistance;
      const force = attraction * diff;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    nodes.forEach((n) => {
      n.vx += (centerX - n.x) * gravity;
      n.vy += (centerY - n.y) * gravity;
      const stepX = Math.max(-maxStep, Math.min(maxStep, n.vx * temperature));
      const stepY = Math.max(-maxStep, Math.min(maxStep, n.vy * temperature));
      n.x += stepX;
      n.y += stepY;
      n.vx *= 0.6;
      n.vy *= 0.6;
    });
  }

  const map = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  return characters.map((c) => {
    const p = map.get(c.id);
    return p ? { ...c, x: p.x, y: p.y } : c;
  });
}

function autoArrange(characters, relations, options) {
  const opts = options || { width: 375, height: 667 };
  if (!characters.length) return [];

  const seed = opts.seed !== false;
  const init = seed
    ? characters.map((c, i) => {
        if (c.x !== 0 || c.y !== 0) return c;
        const angle = (i / Math.max(1, characters.length)) * Math.PI * 2;
        const radius = Math.min(opts.width, opts.height) * 0.28;
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

function computeBounds(characters, padding) {
  const pad = padding == null ? 80 : padding;
  if (!characters.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  characters.forEach((c) => {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  });
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

module.exports = {
  forceLayout,
  autoArrange,
  computeBounds,
};
