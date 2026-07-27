const { getRelationMeta } = require("./theme");

const ROLE_RADIUS = {
  主角: 36,
  重要配角: 24,
  配角: 15,
};

function getNodeRadius(role) {
  return ROLE_RADIUS[role] || 36;
}

/** 男=方，女=圆，未选=菱 */
function getGenderShape(gender) {
  if (gender === "male") return "square";
  if (gender === "female") return "circle";
  return "diamond";
}

function getLabelColor(bg) {
  const hex = String(bg || "").replace("#", "");
  if (hex.length !== 6) return "#1f1b16";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#1f1b16" : "#faf6ec";
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function strokeFillGenderShape(ctx, shape, r, fill, stroke, strokeWidth) {
  if (shape === "diamond") {
    const s = r * 1.4142;
    const rx = s * 0.12;
    ctx.save();
    ctx.rotate(Math.PI / 4);
    roundRect(ctx, -s / 2, -s / 2, s, s, rx);
    if (fill && fill !== "transparent" && fill !== "none") {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && strokeWidth) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else {
    const s = r * 2;
    roundRect(ctx, -r, -r, s, s, r * 0.2);
  }
  if (fill && fill !== "transparent" && fill !== "none") {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && strokeWidth) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawArrow(ctx, x, y, angle, color, size) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const x1 = x - cos * size - sin * size * 0.5;
  const y1 = y - sin * size + cos * size * 0.5;
  const x2 = x - cos * size + sin * size * 0.5;
  const y2 = y - sin * size - cos * size * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPaperBackground(ctx, w, h, viewport) {
  ctx.fillStyle = "#f5efe2";
  ctx.fillRect(0, 0, w, h);

  // 点阵网格（对齐 H5 pattern）
  const grid = 40 * (viewport.scale || 1);
  const ox = (viewport.x || 0) % grid;
  const oy = (viewport.y || 0) % grid;
  ctx.fillStyle = "rgba(31,27,22,0.16)";
  for (let x = ox; x < w; x += grid) {
    for (let y = oy; y < h; y += grid) {
      ctx.beginPath();
      ctx.arc(x, y, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 轻 vignette
  const grd = ctx.createRadialGradient(
    w * 0.5,
    h * 0.5,
    Math.min(w, h) * 0.35,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );
  grd.addColorStop(0, "rgba(245,239,226,0)");
  grd.addColorStop(1, "rgba(122,98,53,0.08)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

function drawRelation(ctx, relation, source, target, opts) {
  const options = opts || {};
  const selected = !!options.selected;
  const dimmed = !!options.dimmed;
  const showLabel = options.showLabel !== false;
  const meta = getRelationMeta(relation.type);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const sr = getNodeRadius(source.role);
  const tr = getNodeRadius(target.role);
  const start = { x: source.x + ux * sr, y: source.y + uy * sr };
  const end = {
    x: target.x - ux * (tr + 4),
    y: target.y - uy * (tr + 4),
  };
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const stroke = meta.color || "#6b6359";
  const strokeW = selected ? 2 : 1.4;
  const isMutual = relation.direction === "mutual";

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.25 : selected ? 1 : 0.78;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeW;
  ctx.lineCap = "round";
  ctx.stroke();

  drawArrow(ctx, end.x, end.y, Math.atan2(uy, ux), stroke, 7);
  if (isMutual) {
    drawArrow(ctx, start.x, start.y, Math.atan2(-uy, -ux), stroke, 7);
  }

  if (showLabel) {
    ctx.globalAlpha = dimmed ? 0.35 : 1;
    roundRect(ctx, mx - 18, my - 10, 36, 20, 2);
    ctx.fillStyle = "#faf6ec";
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = stroke;
    ctx.font = '600 11px "Noto Serif SC"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.glyph || "他", mx, my);

    if (relation.note) {
      const note =
        relation.note.length > 8
          ? relation.note.slice(0, 8) + "…"
          : relation.note;
      ctx.fillStyle = dimmed ? "rgba(31,27,22,0.35)" : "#6b6359";
      ctx.font = '9px "Noto Sans SC"';
      ctx.textBaseline = "top";
      ctx.fillText(note, mx, my + 12);
    }
  }
  ctx.restore();
}

function drawCharacter(ctx, character, opts) {
  const options = opts || {};
  const selected = !!options.selected;
  const connectingFrom = !!options.connectingFrom;
  const dimmed = !!options.dimmed;
  const showLabel = options.showLabel !== false;
  const labelInk = options.labelInk || "#1f1b16";
  const labelMute = options.labelMute || "#6b6359";

  const r = getNodeRadius(character.role);
  const shape = getGenderShape(character.gender);
  const textColor = getLabelColor(character.color);
  const firstChar = (character.name || "无").slice(0, 1);
  const glyphSize = Math.max(12, Math.round(r * 0.72));

  ctx.save();
  ctx.translate(character.x, character.y);
  ctx.globalAlpha = dimmed ? 0.32 : 1;

  ctx.beginPath();
  ctx.ellipse(0, r + 6, r * 0.8, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(31,27,22,0.18)";
  ctx.fill();

  if (selected) {
    ctx.save();
    const haloA =
      (dimmed ? 0.32 : 1) *
      (typeof options.breatheAlpha === "number" ? options.breatheAlpha : 1);
    ctx.globalAlpha = haloA;
    ctx.setLineDash([2, 3]);
    strokeFillGenderShape(ctx, shape, r + 8, "transparent", "#a8322d", 1.2);
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (connectingFrom) {
    ctx.save();
    const haloA =
      (dimmed ? 0.32 : 1) *
      (typeof options.breatheAlpha === "number" ? options.breatheAlpha : 1);
    ctx.globalAlpha = haloA;
    ctx.setLineDash([2, 3]);
    strokeFillGenderShape(ctx, shape, r + 14, "transparent", "#a8322d", 2);
    ctx.setLineDash([]);
    ctx.restore();
  }

  strokeFillGenderShape(
    ctx,
    shape,
    r,
    character.color || "#a8322d",
    selected ? "#1f1b16" : "rgba(245,239,226,0.55)",
    selected ? 1.5 : 1.2,
  );
  strokeFillGenderShape(ctx, shape, r - 5, "transparent", "rgba(245,239,226,0.32)", 0.8);

  ctx.fillStyle = textColor;
  ctx.font = `700 ${glyphSize}px "Noto Serif SC"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(firstChar, 0, 0);

  if (character.alias) {
    ctx.beginPath();
    ctx.arc(r - 2, -r + 4, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#a3824a";
    ctx.fill();
    ctx.strokeStyle = "#faf6ec";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#faf6ec";
    ctx.font = '7px "Noto Serif SC"';
    ctx.fillText("别", r - 2, -r + 4);
  }

  if (showLabel) {
    ctx.fillStyle = labelInk;
    ctx.font = '600 14px "Noto Serif SC"';
    ctx.textBaseline = "top";
    ctx.fillText(character.name || "无名", 0, r + 10);
    if (character.faction) {
      ctx.fillStyle = labelMute;
      ctx.font = '10px "Noto Sans SC"';
      ctx.fillText(character.faction, 0, r + 26);
    }
  }

  ctx.restore();
}

function hitCharacter(characters, wx, wy) {
  for (let i = characters.length - 1; i >= 0; i -= 1) {
    const c = characters[i];
    const r = getNodeRadius(c.role) + 12;
    const dx = wx - c.x;
    const dy = wy - c.y;
    if (dx * dx + dy * dy <= r * r) return c;
  }
  return null;
}

module.exports = {
  getNodeRadius,
  getGenderShape,
  getLabelColor,
  drawPaperBackground,
  drawRelation,
  drawCharacter,
  hitCharacter,
};
