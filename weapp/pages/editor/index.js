const store = require("../../lib/novelStore");
const { requireAuth, handleAuthFailure } = require("../../lib/auth");
const { getNavMetrics } = require("../../lib/navBar");
const {
  RELATION_TYPES,
  CHARACTER_ROLES,
  CHARACTER_GENDERS,
  CHARACTER_COLOR_PRESETS,
  clamp,
  getRelationMeta,
} = require("../../lib/theme");
const { autoArrange, computeBounds } = require("../../lib/layout");
const {
  drawCharacter,
  drawRelation,
  drawPaperBackground,
  hitCharacter,
  getNodeRadius,
} = require("../../lib/graphDraw");
const { loadBrandFonts } = require("../../lib/fonts");

const TAP_TOL = 10;
const LONG_PRESS_MS = 480;

Page({
  data: {
    novelId: "",
    title: "",
    author: "",
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRight: 96,
    safeBottom: 0,
    canvasW: 375,
    canvasH: 667,
    loading: true,
    error: "",
    focused: null,
    focusedSubtitle: "",
    connecting: false,
    fabOpen: false,
    relationGuideOpen: false,
    addOpen: false,
    addForm: emptyAddForm(),
    editChar: null,
    editCharOpen: false,
    editCharDirty: false,
    editForm: {},
    relatedList: [],
    editRel: null,
    editRelOpen: false,
    editRelDirty: false,
    editRelIsNew: false,
    editRelForm: {},
    relSource: null,
    relTarget: null,
    relMeta: {},
    relSubtitle: "",
    confirmDelChar: false,
    confirmDelCharTitle: "删除人物？",
    confirmDelRel: false,
    confirmDelRelDesc: "",
    saving: false,
    undoStack: [],
    redoStack: [],
    colors: CHARACTER_COLOR_PRESETS,
    roles: CHARACTER_ROLES,
    genders: CHARACTER_GENDERS.map((g) => ({
      ...g,
      shape:
        g.key === "male" ? "square" : g.key === "female" ? "circle" : "diamond",
    })),
    relTypes: RELATION_TYPES,
    charCount: 0,
    relCount: 0,
    scalePercent: 100,
    exportOpen: false,
    exportOpts: { bg: "paper", scale: 2, labels: true, title: true },
    exportPreview: "",
    exportBusy: false,
  },

  onLoad(query) {
    const novelId = (query && query.novelId) || "";
    const sys = wx.getSystemInfoSync();
    const nav = getNavMetrics();
    const safeBottom =
      (sys.safeAreaInsets && sys.safeAreaInsets.bottom) ||
      (sys.screenHeight && sys.safeArea
        ? Math.max(0, sys.screenHeight - sys.safeArea.bottom)
        : 0);
    this.setData({
      novelId,
      statusBarHeight: nav.statusBarHeight,
      navBarHeight: nav.navBarHeight,
      // 胶囊避让；模拟器若返回异常值则钳制，避免顶栏被 padding 挤没
      menuRight: Math.min(
        Math.max(nav.menuRight + 8, 88),
        Math.round((sys.windowWidth || 375) * 0.42),
      ),
      safeBottom,
      canvasW: sys.windowWidth || 375,
      canvasH: sys.windowHeight || 667,
    });
    this._viewport = { x: 0, y: 0, scale: 1 };
    this._dpr = sys.pixelRatio || 1;
    this._dragId = null;
    this._panLast = null;
    this._pinch = null;
    this._touchStart = null;
    this._moved = false;
    this._positionChanged = false;
    this._dragOffset = { dx: 0, dy: 0 };
    this._dragStartWorld = null;
    this._connectFrom = null;
    this._characters = [];
    this._relations = [];
    this._novel = null;
    this._exportPath = "";
    this._breatheAlpha = 1;
    this._breatheRaf = null;
    this._breatheScheduled = false;
    if (!requireAuth()) return;
    void this.bootstrap();
  },

  async bootstrap() {
    this.setData({ loading: true, error: "" });
    try {
      const s = store.getState();
      if (!s.hydrated) await store.hydrate();
      this.loadLocal();
      this.setData({ loading: false });
      await Promise.all([this.setupCanvas(), loadBrandFonts()]);
      this.syncHud();
      this.draw();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      this.setData({
        loading: false,
        error: (err && err.message) || "加载失败",
      });
    }
  },

  loadLocal() {
    const { novelId } = this.data;
    const novel = store.getNovel(novelId);
    if (!novel) {
      this.setData({ error: "未找到该作品" });
      return;
    }
    this._novel = novel;
    this._characters = store.getCharacters(novelId).map((c) => ({ ...c }));
    this._relations = store.getRelations(novelId).map((r) => ({ ...r }));
    this.setData({
      title: novel.title,
      author: novel.author || "佚名",
    });
  },

  syncHud() {
    const focused = this.data.focused;
    let focusedSubtitle = "";
    if (focused) {
      const relN = (this._relations || []).filter(
        (r) => r.sourceId === focused.id || r.targetId === focused.id,
      ).length;
      focusedSubtitle = [
        focused.role || null,
        focused.faction || null,
        `${relN} 缘`,
      ]
        .filter(Boolean)
        .join(" · ");
      if (!focusedSubtitle) focusedSubtitle = "暂无关系";
    }
    this.setData({
      charCount: (this._characters || []).length,
      relCount: (this._relations || []).length,
      scalePercent: Math.round((this._viewport.scale || 1) * 100),
      focusedSubtitle,
    });
  },

  markSaving() {
    this.setData({ saving: true });
    if (this._savingTimer) clearTimeout(this._savingTimer);
    this._savingTimer = setTimeout(() => {
      this.setData({ saving: false });
    }, 900);
  },

  pushHistory() {
    const snap = {
      characters: this._characters.map((c) => ({ ...c })),
      relations: this._relations.map((r) => ({ ...r })),
    };
    const undoStack = (this.data.undoStack || []).concat([snap]).slice(-30);
    this.setData({ undoStack, redoStack: [] });
  },

  onUndo() {
    const undoStack = (this.data.undoStack || []).slice();
    if (!undoStack.length) return;
    const cur = {
      characters: this._characters.map((c) => ({ ...c })),
      relations: this._relations.map((r) => ({ ...r })),
    };
    const prev = undoStack.pop();
    const redoStack = (this.data.redoStack || []).concat([cur]);
    this._characters = prev.characters;
    this._relations = prev.relations;
    this.setData({ undoStack, redoStack, focused: null, editChar: null, editCharOpen: false });
    this.commitLocal(false);
    this.syncHud();
    this.draw();
  },

  onRedo() {
    const redoStack = (this.data.redoStack || []).slice();
    if (!redoStack.length) return;
    const cur = {
      characters: this._characters.map((c) => ({ ...c })),
      relations: this._relations.map((r) => ({ ...r })),
    };
    const next = redoStack.pop();
    const undoStack = (this.data.undoStack || []).concat([cur]);
    this._characters = next.characters;
    this._relations = next.relations;
    this.setData({ undoStack, redoStack, focused: null, editChar: null, editCharOpen: false });
    this.commitLocal(false);
    this.syncHud();
    this.draw();
  },

  commitLocal(schedule = true) {
    store.setGraph(this.data.novelId, this._characters, this._relations);
    if (schedule) {
      store.touchNovel(this.data.novelId);
      this.markSaving();
    }
  },

  async setupCanvas() {
    // 等 flex 量完 stage（dock 已悬浮不占流），再取 canvas 尺寸
    await new Promise((r) => setTimeout(r, 80));
    const sys = wx.getSystemInfoSync();
    const fallbackW = sys.windowWidth || 375;
    const fallbackH = Math.max(240, (sys.windowHeight || 667) - 160);

    const queryCanvas = () =>
      new Promise((resolve) => {
        this.createSelectorQuery()
          .select("#graph")
          .fields({ node: true, size: true })
          .exec((res) => resolve(res && res[0]));
      });

    let info = await queryCanvas();
    if (!info || !info.node) return;
    if (!info.width || !info.height) {
      await new Promise((r) => setTimeout(r, 120));
      info = (await queryCanvas()) || info;
    }

    const node = info.node;
    const cssW = Math.max(1, Math.round(info.width || fallbackW));
    const cssH = Math.max(1, Math.round(info.height || fallbackH));
    const dpr = sys.pixelRatio || 1;

    node.width = Math.round(cssW * dpr);
    node.height = Math.round(cssH * dpr);

    this._canvas = node;
    this._ctx = node.getContext("2d");
    this._dpr = dpr;
    this._cssW = cssW;
    this._cssH = cssH;
    this.setData({ canvasW: cssW, canvasH: cssH });
    this.fitView();
  },

  fitView() {
    const chars = this._characters || [];
    if (!chars.length) {
      this._viewport = {
        scale: 1,
        x: (this._cssW || 300) / 2,
        y: (this._cssH || 500) / 2,
      };
      this.syncHud();
      return;
    }
    const bounds = computeBounds(chars, 80);
    const w = this._cssW || 300;
    const h = this._cssH || 500;
    const scale = clamp(
      Math.min(
        (w - 80) / Math.max(bounds.width, 1),
        (h - 200) / Math.max(bounds.height, 1),
        1.2,
      ),
      0.3,
      1.4,
    );
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    this._viewport = {
      scale,
      x: w / 2 - cx * scale,
      y: h / 2 - cy * scale,
    };
    this.syncHud();
  },

  zoomBy(factor) {
    const cx = (this._cssW || 300) / 2;
    const cy = (this._cssH || 500) / 2;
    const vp = this._viewport;
    const newScale = clamp(vp.scale * factor, 0.25, 3);
    const k = newScale / vp.scale;
    this._viewport = {
      scale: newScale,
      x: cx - (cx - vp.x) * k,
      y: cy - (cy - vp.y) * k,
    };
    this.syncHud();
    this.draw();
  },

  worldFromXY(sx, sy) {
    const v = this._viewport;
    return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
  },

  /** 画布局部坐标：优先 touch.x/y，否则用 clientX（全屏画布统一处理） */
  localTouch(t) {
    if (!t) return { x: 0, y: 0 };
    let x = typeof t.x === "number" ? t.x : t.clientX;
    let y = typeof t.y === "number" ? t.y : t.clientY;
    if (typeof x !== "number") x = 0;
    if (typeof y !== "number") y = 0;
    // 部分真机把 x/y 报成物理像素，需折回 CSS 像素
    const w = this._cssW || this.data.canvasW || 0;
    const dpr = this._dpr || 1;
    if (w > 0 && dpr > 1 && x > w * 1.25) {
      x /= dpr;
      y /= dpr;
    }
    return { x, y };
  },

  hitTest(wx, wy) {
    return hitCharacter(this._characters || [], wx, wy);
  },

  hitRelation(wx, wy) {
    const nameById = {};
    (this._characters || []).forEach((c) => {
      nameById[c.id] = c;
    });
    let best = null;
    let bestDist = 14;
    (this._relations || []).forEach((r) => {
      const a = nameById[r.sourceId];
      const b = nameById[r.targetId];
      if (!a || !b) return;
      const sr = getNodeRadius(a.role);
      const tr = getNodeRadius(b.role);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const x1 = a.x + ux * sr;
      const y1 = a.y + uy * sr;
      const x2 = b.x - ux * tr;
      const y2 = b.y - uy * tr;
      const d = distToSegment(wx, wy, x1, y1, x2, y2);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    });
    return best;
  },

  draw() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._cssW;
    const h = this._cssH;
    if (!w || !h) return;
    const v = this._viewport;
    const dpr = this._dpr || 1;

    const needBreathe = !!(this.data.focused || this._connectFrom);
    if (needBreathe) {
      const t = (Date.now() % 2600) / 2600;
      const wave = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      this._breatheAlpha = 0.4 + 0.6 * wave;
    } else {
      this._breatheAlpha = 1;
    }

    // 每帧重置 transform，避免 scale(dpr) 累积导致变形发虚
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawPaperBackground(ctx, w, h, v);

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.scale, v.scale);

    const nameById = {};
    (this._characters || []).forEach((c) => {
      nameById[c.id] = c;
    });

    const focusedId = this.data.focused && this.data.focused.id;
    const selectedRelId = this.data.editRel && this.data.editRel.id;
    const connectFrom = this._connectFrom;
    const breatheAlpha = this._breatheAlpha;

    const neighbors = new Set();
    if (focusedId) {
      neighbors.add(focusedId);
      (this._relations || []).forEach((r) => {
        if (r.sourceId === focusedId) neighbors.add(r.targetId);
        if (r.targetId === focusedId) neighbors.add(r.sourceId);
      });
    }

    (this._relations || []).forEach((r) => {
      const a = nameById[r.sourceId];
      const b = nameById[r.targetId];
      if (!a || !b) return;
      const isSelected = r.id === selectedRelId;
      const isRelated =
        focusedId && (r.sourceId === focusedId || r.targetId === focusedId);
      const dimmed =
        (focusedId && !isRelated) || (selectedRelId && !isSelected);
      drawRelation(ctx, r, a, b, {
        selected: isSelected,
        dimmed,
        showLabel: true,
      });
    });

    (this._characters || []).forEach((c) => {
      const dimmed = focusedId ? !neighbors.has(c.id) : false;
      drawCharacter(ctx, c, {
        selected: c.id === focusedId,
        connectingFrom: c.id === connectFrom,
        dimmed,
        showLabel: true,
        breatheAlpha,
      });
    });

    ctx.restore();
    this.scheduleBreathe(needBreathe);
  },

  scheduleBreathe(need) {
    const canvas = this._canvas;
    const cancel = (id) => {
      if (id == null) return;
      if (canvas && typeof canvas.cancelAnimationFrame === "function") {
        canvas.cancelAnimationFrame(id);
      } else if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(id);
      }
    };
    if (!need) {
      cancel(this._breatheRaf);
      this._breatheRaf = null;
      this._breatheScheduled = false;
      return;
    }
    if (this._breatheScheduled) return;
    this._breatheScheduled = true;
    const schedule = (fn) => {
      if (canvas && typeof canvas.requestAnimationFrame === "function") {
        return canvas.requestAnimationFrame(fn);
      }
      return requestAnimationFrame(fn);
    };
    this._breatheRaf = schedule(() => {
      this._breatheScheduled = false;
      this._breatheRaf = null;
      if (this.data.focused || this._connectFrom) this.draw();
    });
  },

  onUnload() {
    this.scheduleBreathe(false);
  },

  handleTap(target) {
    if (!target || target === "canvas") {
      if (this.data.connecting || this._connectFrom) {
        this._connectFrom = null;
        this.setData({ connecting: false, focused: null });
        this.draw();
        return;
      }
      this.setData({ focused: null, editChar: null, editCharOpen: false });
      this.syncHud();
      this.draw();
      return;
    }
    if (target.startsWith("node:")) {
      const id = target.slice(5);
      if (this.data.connecting || this._connectFrom) {
        if (!this._connectFrom) {
          this._connectFrom = id;
          const hit = (this._characters || []).find((c) => c.id === id);
          this.setData({ focused: hit || null });
          this.syncHud();
          this.draw();
          return;
        }
        if (id === this._connectFrom) {
          this._connectFrom = null;
          this.setData({ connecting: false, focused: null });
          this.draw();
          return;
        }
        const sourceId = this._connectFrom;
        this._connectFrom = null;
        this.setData({ connecting: false, focused: null });
        this.completeConnect(sourceId, id);
        return;
      }
      const focusedId = this.data.focused && this.data.focused.id;
      if (id === focusedId) {
        this.openCharPanel();
        return;
      }
      const hit = (this._characters || []).find((c) => c.id === id);
      this.setData({ focused: hit || null, editChar: null, editCharOpen: false });
      this.syncHud();
      this.draw();
      return;
    }
    if (target.startsWith("edge:")) {
      const rel = (this._relations || []).find((r) => r.id === target.slice(5));
      if (rel) this.openRelPanel(rel);
    }
  },

  onTouchStart(e) {
    const touches = e.touches || [];
    if (!touches.length) return;
    this._clearLongPress();
    this._moved = false;
    this._positionChanged = false;

    if (touches.length >= 2) {
      this._dragId = null;
      const a = this.localTouch(touches[0]);
      const b = this.localTouch(touches[1]);
      this._pinch = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        scale: this._viewport.scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      this._panLast = null;
      return;
    }

    const t = this.localTouch(touches[0]);
    const world = this.worldFromXY(t.x, t.y);
    const hit = this.hitTest(world.x, world.y);
    const rel = hit ? null : this.hitRelation(world.x, world.y);
    let target = "canvas";
    if (hit) target = `node:${hit.id}`;
    else if (rel) target = `edge:${rel.id}`;

    this._touchStart = { x: t.x, y: t.y, target, world };
    this._panLast = { x: t.x, y: t.y };

    if (hit) {
      this._dragId = hit.id;
      this._dragOffset = { dx: world.x - hit.x, dy: world.y - hit.y };
      this._dragStartWorld = { x: hit.x, y: hit.y };
      this._dragHistoryPushed = false;
    } else {
      this._dragId = null;
      this._dragStartWorld = null;
      this._dragHistoryPushed = false;
    }

    this._longPressTimer = setTimeout(() => {
      if (this._moved) return;
      const start = this._touchStart;
      if (!start) return;
      if (start.target.startsWith("node:")) {
        this.beginConnectFrom(start.target.slice(5));
      } else if (start.target === "canvas" && !this.data.connecting) {
        this._addAt = { x: start.world.x, y: start.world.y };
        const color =
          CHARACTER_COLOR_PRESETS[
            Math.floor(Math.random() * CHARACTER_COLOR_PRESETS.length)
          ];
        this.setData({
          addOpen: true,
          addForm: { ...emptyAddForm(), color },
          relationGuideOpen: false,
        });
      }
      this._touchStart = null;
    }, LONG_PRESS_MS);
  },

  onTouchMove(e) {
    const touches = e.touches || [];
    if (!touches.length) return;

    if (touches.length >= 2 && this._pinch) {
      this._clearLongPress();
      this._moved = true;
      const a = this.localTouch(touches[0]);
      const b = this.localTouch(touches[1]);
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const factor = dist / (this._pinch.dist || 1);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const prev = this._viewport;
      const newScale = clamp(this._pinch.scale * factor, 0.25, 3);
      const k = newScale / prev.scale;
      this._viewport = {
        scale: newScale,
        x: cx - (cx - prev.x) * k,
        y: cy - (cy - prev.y) * k,
      };
      this.syncHud();
      this.draw();
      return;
    }

    const t = this.localTouch(touches[0]);
    const start = this._touchStart;
    if (start && Math.hypot(t.x - start.x, t.y - start.y) > TAP_TOL) {
      this._moved = true;
      this._clearLongPress();
    }

    if (this._dragId) {
      const world = this.worldFromXY(t.x, t.y);
      const nx = world.x - this._dragOffset.dx;
      const ny = world.y - this._dragOffset.dy;
      if (
        this._dragStartWorld &&
        Math.hypot(nx - this._dragStartWorld.x, ny - this._dragStartWorld.y) > 0.5
      ) {
        this._positionChanged = true;
      }
      const c = (this._characters || []).find((x) => x.id === this._dragId);
      if (c) {
        if (this._positionChanged && !this._dragHistoryPushed) {
          this.pushHistory();
          this._dragHistoryPushed = true;
        }
        c.x = nx;
        c.y = ny;
        if (this._positionChanged) {
          this.setData({ focused: { ...c } });
        }
        this.draw();
      }
      return;
    }

    if (this._panLast && this._moved) {
      const dx = t.x - this._panLast.x;
      const dy = t.y - this._panLast.y;
      this._panLast = { x: t.x, y: t.y };
      this._viewport = {
        ...this._viewport,
        x: this._viewport.x + dx,
        y: this._viewport.y + dy,
      };
      this.draw();
    } else if (this._panLast) {
      this._panLast = { x: t.x, y: t.y };
    }
  },

  onTouchEnd() {
    this._clearLongPress();
    if (this._dragId && this._positionChanged) {
      this.commitLocal(true);
    }
    this._dragId = null;
    this._dragStartWorld = null;
    this._positionChanged = false;
    this._dragHistoryPushed = false;
    this._pinch = null;
    this._panLast = null;

    const start = this._touchStart;
    const moved = this._moved;
    this._touchStart = null;
    this._moved = false;
    if (start && !moved) {
      this.handleTap(start.target);
    }
  },

  _clearLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  },

  zoomIn() {
    this.zoomBy(1.25);
  },
  zoomOut() {
    this.zoomBy(0.8);
  },
  zoomReset() {
    this.fitView();
    this.draw();
  },

  onAutoLayout() {
    this.pushHistory();
    const w = this._cssW || 375;
    const h = this._cssH || 600;
    this._characters = autoArrange(this._characters, this._relations, {
      width: w,
      height: h,
    });
    this.commitLocal(true);
    this.fitView();
    this.draw();
    wx.showToast({ title: "已自动排版", icon: "none" });
  },

  dismissFocus() {
    this.setData({ focused: null });
    this.syncHud();
    this.draw();
  },

  toggleFab() {
    this.setData({ fabOpen: !this.data.fabOpen });
  },
  closeFab() {
    this.setData({ fabOpen: false });
  },

  startConnect() {
    this._connectFrom = null;
    this.setData({
      fabOpen: false,
      relationGuideOpen: true,
      connecting: false,
      focused: null,
      editChar: null,
      editCharOpen: false,
    });
    this.draw();
  },
  dismissRelationGuide() {
    this.setData({ relationGuideOpen: false });
  },
  beginConnectFrom(id) {
    this._connectFrom = id;
    this.setData({
      connecting: true,
      relationGuideOpen: false,
      focused: null,
      editChar: null,
      editCharOpen: false,
      fabOpen: false,
    });
    this.draw();
  },

  openAdd() {
    const v = this._viewport;
    const x = (this._cssW / 2 - v.x) / v.scale;
    const y = (this._cssH / 2 - v.y) / v.scale;
    this._addAt = { x, y };
    const color =
      CHARACTER_COLOR_PRESETS[
        Math.floor(Math.random() * CHARACTER_COLOR_PRESETS.length)
      ];
    this.setData({
      fabOpen: false,
      addOpen: true,
      addForm: { ...emptyAddForm(), color },
    });
  },
  closeAdd() {
    this.setData({ addOpen: false });
  },
  onAddName(e) {
    this.setData({ "addForm.name": e.detail.value });
  },
  onAddAlias(e) {
    this.setData({ "addForm.alias": e.detail.value });
  },
  onAddFaction(e) {
    this.setData({ "addForm.faction": e.detail.value });
  },
  onAddRole(e) {
    this.setData({ "addForm.role": e.currentTarget.dataset.role });
  },
  onAddGender(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ "addForm.gender": key === "unknown" ? "" : key || "" });
  },
  onAddColor(e) {
    this.setData({ "addForm.color": e.currentTarget.dataset.color });
  },
  onAddNote(e) {
    this.setData({ "addForm.note": e.detail.value });
  },
  submitAdd() {
    const f = this.data.addForm;
    const name = (f.name || "").trim();
    if (!name) {
      wx.showToast({ title: "请填写姓名", icon: "none" });
      return;
    }
    this.pushHistory();
    const pos = this._addAt || { x: 0, y: 0 };
    const c = {
      id: store.uid("char"),
      novelId: this.data.novelId,
      name,
      alias: (f.alias || "").trim() || undefined,
      role: f.role || "主角",
      faction: (f.faction || "").trim(),
      gender: f.gender || undefined,
      color: f.color || CHARACTER_COLOR_PRESETS[0],
      note: (f.note || "").trim(),
      x: pos.x,
      y: pos.y,
      createdAt: Date.now(),
    };
    this._characters.push(c);
    this.setData({ addOpen: false, focused: c });
    this.commitLocal(true);
    this.syncHud();
    this.draw();
  },

  buildRelatedList(charId) {
    const chars = this._characters || [];
    return (this._relations || [])
      .filter((r) => r.sourceId === charId || r.targetId === charId)
      .map((r) => {
        const outward = r.sourceId === charId;
        const otherId = outward ? r.targetId : r.sourceId;
        const other = chars.find((c) => c.id === otherId);
        const meta = getRelationMeta(r.type);
        return {
          id: r.id,
          otherName: (other && other.name) || "？",
          note: r.note || "",
          direction: r.direction,
          outward,
          color: meta.color,
          glyph: meta.glyph,
        };
      })
      .filter((x) => x.otherName);
  },

  openCharPanel() {
    const c = this.data.focused;
    if (!c) return;
    this.setData({
      editChar: c,
      editCharOpen: true,
      editCharDirty: false,
      editForm: {
        name: c.name,
        alias: c.alias || "",
        role: c.role || "主角",
        faction: c.faction || "",
        gender: c.gender || "",
        color: c.color,
        note: c.note || "",
      },
      relatedList: this.buildRelatedList(c.id),
    });
  },
  closeCharPanel() {
    this.setData({ editChar: null, editCharOpen: false, editCharDirty: false });
  },
  markCharDirty() {
    if (!this.data.editCharDirty) this.setData({ editCharDirty: true });
  },
  onEditName(e) {
    this.setData({ "editForm.name": e.detail.value });
    this.markCharDirty();
  },
  onEditAlias(e) {
    this.setData({ "editForm.alias": e.detail.value });
    this.markCharDirty();
  },
  onEditFaction(e) {
    this.setData({ "editForm.faction": e.detail.value });
    this.markCharDirty();
  },
  onEditRoleChip(e) {
    this.setData({ "editForm.role": e.currentTarget.dataset.role });
    this.markCharDirty();
  },
  onEditGender(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ "editForm.gender": key === "unknown" ? "" : key || "" });
    this.markCharDirty();
  },
  onEditColor(e) {
    this.setData({ "editForm.color": e.currentTarget.dataset.color });
    this.markCharDirty();
  },
  onEditNote(e) {
    this.setData({ "editForm.note": e.detail.value });
    this.markCharDirty();
  },
  saveChar() {
    const id = this.data.editChar && this.data.editChar.id;
    if (!id) return;
    this.pushHistory();
    const f = this.data.editForm;
    this._characters = this._characters.map((c) =>
      c.id === id
        ? {
            ...c,
            name: (f.name || "").trim() || c.name,
            alias: (f.alias || "").trim() || undefined,
            role: f.role || "",
            faction: f.faction || "",
            gender: f.gender || undefined,
            color: f.color || c.color,
            note: f.note || "",
          }
        : c,
    );
    const focused = this._characters.find((c) => c.id === id);
    this.setData({
      editChar: null,
      editCharOpen: false,
      editCharDirty: false,
      focused,
    });
    this.commitLocal(true);
    this.syncHud();
    this.draw();
  },
  openRelatedRel(e) {
    const id = e.currentTarget.dataset.id;
    const rel = (this._relations || []).find((r) => r.id === id);
    if (!rel) return;
    this.setData({ editChar: null, editCharOpen: false, editCharDirty: false });
    this.openRelPanel(rel);
  },
  askDelChar() {
    const name = (this.data.editChar && this.data.editChar.name) || "人物";
    this.setData({
      confirmDelChar: true,
      confirmDelCharTitle: `删除「${name}」？`,
    });
  },
  cancelDelChar() {
    this.setData({ confirmDelChar: false });
  },
  doDelChar() {
    const id = this.data.editChar && this.data.editChar.id;
    this.setData({
      confirmDelChar: false,
      editChar: null,
      editCharOpen: false,
      editCharDirty: false,
      focused: null,
    });
    if (!id) return;
    this.pushHistory();
    this._characters = this._characters.filter((c) => c.id !== id);
    this._relations = this._relations.filter(
      (r) => r.sourceId !== id && r.targetId !== id,
    );
    this.commitLocal(true);
    this.syncHud();
    this.draw();
  },

  openRelPanel(rel, opts) {
    const isNew = !!(opts && opts.isNew);
    const chars = this._characters || [];
    const source = chars.find((c) => c.id === rel.sourceId) || {
      name: "？",
      color: "#6b6359",
    };
    const target = chars.find((c) => c.id === rel.targetId) || {
      name: "？",
      color: "#6b6359",
    };
    const meta = getRelationMeta(rel.type);
    this.setData({
      focused: null,
      editRel: rel,
      editRelOpen: true,
      editRelDirty: false,
      editRelIsNew: isNew,
      editRelForm: {
        type: rel.type || "other",
        direction: rel.direction || "one-way",
        note: rel.note || "",
      },
      relSource: source,
      relTarget: target,
      relMeta: meta,
      relSubtitle: `${source.name} → ${target.name}`,
    });
    this.draw();
  },
  closeRelPanel() {
    this.setData({
      editRel: null,
      editRelOpen: false,
      editRelDirty: false,
      editRelIsNew: false,
    });
    this.draw();
  },
  markRelDirty() {
    if (!this.data.editRelDirty) this.setData({ editRelDirty: true });
  },
  onRelType(e) {
    const type = e.currentTarget.dataset.key;
    this.setData({
      "editRelForm.type": type,
      relMeta: getRelationMeta(type),
    });
    this.markRelDirty();
  },
  onRelDir(e) {
    this.setData({ "editRelForm.direction": e.currentTarget.dataset.dir });
    this.markRelDirty();
  },
  onRelNote(e) {
    this.setData({ "editRelForm.note": e.detail.value });
    this.markRelDirty();
  },
  swapRelEnds() {
    if (this.data.editRelForm.direction !== "one-way") return;
    const rel = this.data.editRel;
    if (!rel) return;
    const next = {
      ...rel,
      sourceId: rel.targetId,
      targetId: rel.sourceId,
    };
    if (this.data.editRelIsNew) {
      this.openRelPanel(next, { isNew: true });
      return;
    }
    this.pushHistory();
    this._relations = this._relations.map((r) =>
      r.id === rel.id ? next : r,
    );
    this.commitLocal(true);
    this.openRelPanel(next);
  },
  saveRel() {
    const rel = this.data.editRel;
    if (!rel) return;
    const f = this.data.editRelForm;
    this.pushHistory();
    if (this.data.editRelIsNew) {
      this._relations.push({
        id: store.uid("rel"),
        novelId: this.data.novelId,
        sourceId: rel.sourceId,
        targetId: rel.targetId,
        type: f.type || "other",
        direction: f.direction || "one-way",
        note: f.note || "",
        createdAt: Date.now(),
      });
    } else {
      const id = rel.id;
      if (!id) return;
      this._relations = this._relations.map((r) =>
        r.id === id
          ? {
              ...r,
              type: f.type,
              direction: f.direction,
              note: f.note || "",
            }
          : r,
      );
    }
    this.setData({
      editRel: null,
      editRelOpen: false,
      editRelDirty: false,
      editRelIsNew: false,
    });
    this.commitLocal(true);
    this.syncHud();
    this.draw();
  },
  askDelRel() {
    if (this.data.editRelIsNew) {
      this.closeRelPanel();
      return;
    }
    const s = (this.data.relSource && this.data.relSource.name) || "";
    const t = (this.data.relTarget && this.data.relTarget.name) || "";
    this.setData({
      confirmDelRel: true,
      confirmDelRelDesc: `将切断「${s}」与「${t}」之间的连接。`,
    });
  },
  cancelDelRel() {
    this.setData({ confirmDelRel: false });
  },
  doDelRel() {
    const id = this.data.editRel && this.data.editRel.id;
    this.setData({
      confirmDelRel: false,
      editRel: null,
      editRelOpen: false,
      editRelDirty: false,
      editRelIsNew: false,
    });
    if (!id) return;
    this.pushHistory();
    this._relations = this._relations.filter((r) => r.id !== id);
    this.commitLocal(true);
    this.syncHud();
    this.draw();
  },

  completeConnect(sourceId, targetId) {
    this.openRelPanel(
      {
        id: null,
        novelId: this.data.novelId,
        sourceId,
        targetId,
        type: "other",
        direction: "one-way",
        note: "",
      },
      { isNew: true },
    );
  },

  onExport() {
    this._exportCanvas = null;
    this._exportCtx = null;
    this._exportPath = "";
    this.setData({
      exportOpen: true,
      exportPreview: "",
      exportBusy: false,
    });
  },
  closeExport() {
    this._exportCanvas = null;
    this._exportCtx = null;
    this.setData({ exportOpen: false, exportPreview: "" });
  },
  onExportBg(e) {
    this.setData({ "exportOpts.bg": e.currentTarget.dataset.bg });
  },
  onExportScale(e) {
    this.setData({
      "exportOpts.scale": Number(e.currentTarget.dataset.scale) || 2,
    });
  },
  toggleExportLabels() {
    this.setData({ "exportOpts.labels": !this.data.exportOpts.labels });
  },
  toggleExportTitle() {
    this.setData({ "exportOpts.title": !this.data.exportOpts.title });
  },

  async ensureExportCanvas() {
    if (this._exportCanvas && this._exportCtx) return;
    await new Promise((r) => setTimeout(r, 60));
    const query = this.createSelectorQuery();
    const canvas = await new Promise((resolve) => {
      query
        .select("#export-canvas")
        .fields({ node: true, size: true })
        .exec((res) => resolve(res && res[0]));
    });
    if (!canvas || !canvas.node) throw new Error("导出画布不可用");
    this._exportCanvas = canvas.node;
    this._exportCtx = canvas.node.getContext("2d");
  },

  async renderExportToTemp() {
    await this.ensureExportCanvas();
    const opts = this.data.exportOpts;
    const chars = this._characters || [];
    const rels = this._relations || [];
    const scale = opts.scale || 2;
    const pad = 80;
    const bounds = chars.length
      ? computeBounds(chars, pad)
      : { x: -200, y: -200, width: 400, height: 400 };
    const titleH = opts.title ? 72 : 24;
    const width = Math.max(360, Math.ceil(bounds.width + 40));
    const height = Math.max(480, Math.ceil(bounds.height + titleH + 40));
    const canvas = this._exportCanvas;
    const ctx = this._exportCtx;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);

    const bg = opts.bg === "ink" ? "#1f1b16" : "#f5efe2";
    const ink = opts.bg === "ink" ? "#f5efe2" : "#1f1b16";
    const mute = opts.bg === "ink" ? "rgba(245,239,226,0.55)" : "#6b6359";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    if (opts.title) {
      ctx.fillStyle = ink;
      ctx.font = '700 22px "Noto Serif SC"';
      ctx.textAlign = "left";
      ctx.fillText(this.data.title || "墨缘", 24, 36);
      ctx.fillStyle = mute;
      ctx.font = '12px "Noto Sans SC"';
      ctx.fillText(
        `${this.data.author || "佚名"} · ${chars.length}人 · ${rels.length}缘`,
        24,
        56,
      );
    }

    const ox = 20 - bounds.x;
    const oy = titleH - bounds.y;
    ctx.save();
    ctx.translate(ox, oy);

    const nameById = {};
    chars.forEach((c) => {
      nameById[c.id] = c;
    });
    rels.forEach((r) => {
      const a = nameById[r.sourceId];
      const b = nameById[r.targetId];
      if (!a || !b) return;
      drawRelation(ctx, r, a, b, { showLabel: opts.labels });
    });
    chars.forEach((c) => {
      drawCharacter(ctx, c, {
        showLabel: opts.labels,
        labelInk: ink,
        labelMute: mute,
      });
    });
    ctx.restore();

    const path = await new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: "png",
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      });
    });
    this._exportPath = path;
    return path;
  },

  async renderExportPreview() {
    if (this.data.exportBusy) return;
    this.setData({ exportBusy: true });
    try {
      const path = await this.renderExportToTemp();
      this.setData({ exportPreview: path });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "预览失败",
        icon: "none",
      });
    } finally {
      this.setData({ exportBusy: false });
    }
  },

  async saveExport() {
    if (this.data.exportBusy) return;
    this.setData({ exportBusy: true });
    try {
      const path = this._exportPath || (await this.renderExportToTemp());
      await new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
          filePath: path,
          success: resolve,
          fail: reject,
        });
      });
      this.setData({ exportPreview: path });
      wx.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      const msg = (err && err.errMsg) || (err && err.message) || "";
      if (/auth|authorize|permission/i.test(msg)) {
        wx.showModal({
          title: "需要相册权限",
          content: "请在设置中允许保存到相册后重试。",
          confirmText: "去设置",
          success: (r) => {
            if (r.confirm) wx.openSetting({});
          },
        });
      } else {
        wx.showToast({ title: msg || "保存失败", icon: "none" });
      }
    } finally {
      this.setData({ exportBusy: false });
    }
  },

  async shareExport() {
    if (this.data.exportBusy) return;
    this.setData({ exportBusy: true });
    try {
      const path = this._exportPath || (await this.renderExportToTemp());
      this.setData({ exportPreview: path });
      await new Promise((resolve, reject) => {
        wx.showShareImageMenu({
          path,
          success: resolve,
          fail: reject,
        });
      });
    } catch (err) {
      // 低版本无 showShareImageMenu 时回退保存
      try {
        await this.saveExport();
      } catch (_) {
        wx.showToast({
          title: (err && err.errMsg) || "分享失败",
          icon: "none",
        });
      }
    } finally {
      this.setData({ exportBusy: false });
    }
  },

  async onSave() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      this.commitLocal(false);
      await store.flushNovel(this.data.novelId);
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (err) {
      wx.showToast({
        title: (err && err.message) || "保存失败",
        icon: "none",
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  onBack() {
    wx.navigateBack({
      fail: () => wx.reLaunch({ url: "/pages/library/index" }),
    });
  },
});

function emptyAddForm() {
  return {
    name: "",
    alias: "",
    role: "主角",
    faction: "",
    gender: "",
    color: CHARACTER_COLOR_PRESETS[0],
    note: "",
  };
}

function pinchDist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) || 1;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return Math.hypot(px - nx, py - ny);
}
