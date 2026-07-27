/** 与 H5 / 云函数共用的 CloudBase 环境 ID */
const ENV_ID = "moyuan-d5gab9aqm5759b176";

const FONT_CDN =
  "https://6d6f-moyuan-d5gab9aqm5759b176-1257829764.tcb.qcloud.la/fonts";

/**
 * 需经 wx.loadFontFace 注册的字体面。
 * url 为空则跳过该条。
 * @type {{ family: string, url: string, weight?: string, style?: string }[]}
 */
const FONT_FACES = [
  {
    family: "Noto Serif SC",
    url: `${FONT_CDN}/NotoSerifSC-Regular.otf`,
    weight: "400",
    style: "normal",
  },
  {
    family: "Noto Serif SC",
    url: `${FONT_CDN}/NotoSerifSC-Bold.otf`,
    weight: "700",
    style: "normal",
  },
  {
    family: "Noto Sans SC",
    url: `${FONT_CDN}/NotoSansSC-Regular.otf`,
    weight: "400",
    style: "normal",
  },
  {
    family: "Noto Sans SC",
    url: `${FONT_CDN}/NotoSansSC-Bold.otf`,
    weight: "700",
    style: "normal",
  },
  {
    family: "Cormorant Garamond",
    url: `${FONT_CDN}/CormorantGaramond-wght.ttf`,
    weight: "400",
    style: "normal",
  },
  {
    family: "Cormorant Garamond",
    url: `${FONT_CDN}/CormorantGaramond-Italic-wght.ttf`,
    weight: "400",
    style: "italic",
  },
  {
    family: "Ma Shan Zheng",
    url: `${FONT_CDN}/MaShanZheng-Regular.ttf`,
    weight: "400",
    style: "normal",
  },
];

function gatewayBase() {
  return `https://${ENV_ID}.api.tcloudbasegateway.com`;
}

/** HTTP 访问服务（CloudBase HTTP Access Service）无需认证，用于登录等场景 */
function httpServiceBase() {
  return `https://${ENV_ID}-1257829764.ap-shanghai.app.tcloudbase.com`;
}

module.exports = { ENV_ID, gatewayBase, httpServiceBase, FONT_FACES, FONT_CDN };
