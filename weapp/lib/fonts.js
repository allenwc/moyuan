const { FONT_FACES } = require("./config");

let loading = null;
let loaded = false;

function loadOneFace(face) {
  const url = (face.url || "").trim();
  if (!url) return Promise.resolve();

  return new Promise((resolve) => {
    wx.loadFontFace({
      family: face.family,
      source: `url("${url}")`,
      global: true,
      scopes: ["webview", "native"],
      desc: {
        style: face.style || "normal",
        weight: face.weight || "normal",
      },
      success() {
        resolve();
      },
      fail(err) {
        console.warn("[fonts] loadFontFace failed", face.family, face.weight, err);
        resolve();
      },
    });
  });
}

/**
 * 注册品牌字体族（Noto Sans/Serif、Cormorant、马善政）。
 * scopes 含 native，供 Canvas 2D 使用。失败不抛错。
 * @returns {Promise<void>}
 */
function loadBrandFonts() {
  if (loaded) return Promise.resolve();
  if (loading) return loading;

  const faces = (FONT_FACES || []).filter((f) => f && (f.url || "").trim());
  if (!faces.length) {
    return Promise.resolve();
  }

  loading = Promise.all(faces.map(loadOneFace))
    .then(() => {
      loaded = true;
    })
    .finally(() => {
      loading = null;
    });

  return loading;
}

module.exports = { loadBrandFonts };
