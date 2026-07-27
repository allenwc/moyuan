const store = require("../../lib/novelStore");
const { requireAuth, signOut, handleAuthFailure } = require("../../lib/auth");
const { THEME_PALETTES } = require("../../lib/theme");
const {
  readerSealChar,
  readerFullLabel,
  readerChannelLabel,
} = require("../../lib/readerIdentity");
const { getNavMetrics } = require("../../lib/navBar");

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalTop: 64,
    menuRight: 96,
    user: null,
    loading: true,
    error: "",
    filtered: [],
    stats: { novelCount: 0, characterCount: 0, relationCount: 0 },
    query: "",
    sort: "updated",
    pinned: false,
    formOpen: false,
    editingNovel: null,
    form: { title: "", author: "", synopsis: "", themeColor: "vermillion" },
    formTouched: false,
    themes: THEME_PALETTES,
    menuNovel: null,
    accountOpen: false,
    accountSeal: "藏",
    accountFull: "",
    accountChannel: "",
    confirmDelete: false,
    confirmLogout: false,
  },

  onLoad() {
    const m = getNavMetrics();
    const themes = THEME_PALETTES.map((p) => ({
      ...p,
      glyph: (p.label && p.label[0]) || "·",
    }));
    this.setData({
      statusBarHeight: m.statusBarHeight,
      navBarHeight: m.navBarHeight,
      totalTop: m.totalTop,
      menuRight: m.menuRight + 8,
      themes,
    });
  },

  onShow() {
    const user = requireAuth();
    if (!user) return;
    this.setData({
      user,
      accountSeal: readerSealChar(user),
      accountFull: readerFullLabel(user),
      accountChannel: readerChannelLabel(user),
    });
    if (this._unsub) this._unsub();
    this._unsub = store.subscribe(() => this.refreshFromStore());
    const hasList =
      Array.isArray(this.data.filtered) && this.data.filtered.length > 0;
    const silent = this._didLoadOnce && hasList && !this.data.loading;
    void this.load({ silent });
  },

  onHide() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
  },

  onUnload() {
    if (this._unsub) {
      this._unsub();
      this._unsub = null;
    }
  },

  onPageScroll(e) {
    const pinned = (e.scrollTop || 0) > 80;
    if (pinned !== this.data.pinned) this.setData({ pinned });
  },

  async load(opts) {
    const silent = !!(opts && opts.silent);
    if (!silent) this.setData({ loading: true, error: "" });
    try {
      await store.hydrate();
      this.refreshFromStore();
      this._didLoadOnce = true;
      if (!silent) this.setData({ loading: false });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      if (silent) {
        wx.showToast({
          title: (err && err.message) || "刷新失败",
          icon: "none",
        });
        return;
      }
      this.setData({
        loading: false,
        error: (err && err.message) || "加载失败",
      });
    }
  },

  refreshFromStore() {
    const s = store.getState();
    const q = (this.data.query || "").trim().toLowerCase();
    let list = (s.novels || []).slice();
    if (q) {
      list = list.filter((n) => {
        const blob = `${n.title} ${n.author} ${n.synopsis}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (this.data.sort === "title") {
      list.sort((a, b) => String(a.title).localeCompare(String(b.title), "zh"));
    } else {
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    const filtered = list.map((n) => ({
      ...n,
      charCount: (s.characters || []).filter((c) => c.novelId === n.id).length,
      relCount: (s.relations || []).filter((r) => r.novelId === n.id).length,
    }));
    this.setData({
      filtered,
      stats: {
        novelCount: (s.novels || []).length,
        characterCount: (s.characters || []).length,
        relationCount: (s.relations || []).length,
      },
      error: s.loadError || "",
    });
  },

  onQuery(e) {
    this.setData({ query: e.detail.value }, () => this.refreshFromStore());
  },

  onSort(e) {
    this.setData({ sort: e.currentTarget.dataset.sort }, () =>
      this.refreshFromStore(),
    );
  },

  onOpenNovel(e) {
    const id = e.detail.id;
    wx.navigateTo({ url: `/pages/editor/index?novelId=${id}` });
  },

  onMoreNovel(e) {
    this.setData({ menuNovel: e.detail.novel });
  },

  closeMenu() {
    this.setData({ menuNovel: null });
  },

  openCreate() {
    this.setData({
      formOpen: true,
      editingNovel: null,
      formTouched: false,
      form: { title: "", author: "", synopsis: "", themeColor: "vermillion" },
    });
  },

  closeForm() {
    this.setData({ formOpen: false, editingNovel: null });
  },

  onFormTitle(e) {
    this.setData({ "form.title": e.detail.value });
  },
  onFormAuthor(e) {
    this.setData({ "form.author": e.detail.value });
  },
  onFormSynopsis(e) {
    this.setData({ "form.synopsis": e.detail.value });
  },
  onFormTheme(e) {
    this.setData({ "form.themeColor": e.currentTarget.dataset.key });
  },

  submitForm() {
    this.setData({ formTouched: true });
    const title = (this.data.form.title || "").trim();
    if (!title) return;
    const input = {
      title,
      author: this.data.form.author,
      synopsis: this.data.form.synopsis,
      themeColor: this.data.form.themeColor,
    };
    if (this.data.editingNovel) {
      store.updateNovel(this.data.editingNovel.id, input);
      this.setData({ formOpen: false, editingNovel: null });
      wx.showToast({ title: "已保存", icon: "success" });
      return;
    }
    const id = store.createNovel(input);
    this.setData({ formOpen: false });
    if (id) wx.navigateTo({ url: `/pages/editor/index?novelId=${id}` });
  },

  menuEdit() {
    const n = this.data.menuNovel;
    if (!n) return;
    this.setData({
      menuNovel: null,
      formOpen: true,
      editingNovel: n,
      formTouched: false,
      form: {
        title: n.title,
        author: n.author || "",
        synopsis: n.synopsis || "",
        themeColor: n.themeColor || "vermillion",
      },
    });
  },

  menuDup() {
    const n = this.data.menuNovel;
    if (!n) return;
    const id = store.duplicateNovel(n.id);
    this.setData({ menuNovel: null });
    wx.showToast({ title: "已复制", icon: "success" });
    if (id) setTimeout(() => {
      wx.navigateTo({ url: `/pages/editor/index?novelId=${id}` });
    }, 400);
  },

  menuDelete() {
    this.setData({ confirmDelete: true });
  },

  doDelete() {
    const n = this.data.menuNovel;
    this.setData({ confirmDelete: false, menuNovel: null });
    if (n) store.deleteNovel(n.id);
  },

  cancelDelete() {
    this.setData({ confirmDelete: false });
  },

  openAccount() {
    this.setData({ accountOpen: true });
  },
  openSettings() {
    this.setData({ accountOpen: false });
    wx.navigateTo({ url: "/pages/settings/index" });
  },
  closeAccount() {
    this.setData({ accountOpen: false });
  },
  askLogout() {
    this.setData({ confirmLogout: true });
  },
  cancelLogout() {
    this.setData({ confirmLogout: false });
  },
  doLogout() {
    this.setData({ confirmLogout: false, accountOpen: false });
    signOut();
    wx.reLaunch({ url: "/pages/login/index" });
  },
});
