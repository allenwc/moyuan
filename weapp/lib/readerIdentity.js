function readerSealChar(user) {
  if (!user) return "藏";
  const email = (user.email || "").trim();
  if (email) {
    const local = email.split("@")[0] || "";
    const ch = local.charAt(0);
    if (ch) return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
  }
  return "藏";
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return email.length <= 18 ? email : `${email.slice(0, 15)}…`;
  if (email.length <= 18) return email;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function fallbackIdentity(user) {
  switch (user && user.channel) {
    case "mini":
    case "web":
      return "微信读者";
    case "email":
    case "cloudbase":
      return "邮箱读者";
    case "dev":
      return "开发帐号";
    default:
      return "墨缘帐号";
  }
}

function readerShortLabel(user) {
  if (!user) return "墨缘帐号";
  const email = (user.email || "").trim();
  if (email) return maskEmail(email);
  return fallbackIdentity(user);
}

function readerFullLabel(user) {
  if (!user) return "墨缘帐号";
  const email = (user.email || "").trim();
  if (email) return email;
  return fallbackIdentity(user);
}

function readerChannelLabel(user) {
  switch (user && user.channel) {
    case "email":
    case "cloudbase":
      return "邮箱登录";
    case "mini":
      return "微信小程序";
    case "web":
      return "微信网页";
    case "dev":
      return "开发帐号";
    default:
      return "墨缘帐号";
  }
}

module.exports = {
  readerSealChar,
  readerShortLabel,
  readerFullLabel,
  readerChannelLabel,
};
