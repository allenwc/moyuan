import type { SessionUser } from "@/lib/authStorage";

/** 印面单字：邮箱本地部分首字，否则「藏」 */
export function readerSealChar(user: SessionUser): string {
  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0] || "";
    const ch = local.charAt(0);
    if (ch) {
      return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
    }
  }
  return "藏";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email.length <= 18 ? email : `${email.slice(0, 15)}…`;
  if (email.length <= 18) return email;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***@${domain}`;
}

function fallbackIdentity(user: SessionUser): string {
  switch (user.channel) {
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

/** 刊头 / 收缩头短标 */
export function readerShortLabel(user: SessionUser): string {
  const email = user.email?.trim();
  if (email) return maskEmail(email);
  return fallbackIdentity(user);
}

/** Sheet 内完整身份 */
export function readerFullLabel(user: SessionUser): string {
  const email = user.email?.trim();
  if (email) return email;
  return fallbackIdentity(user);
}

/** Sheet 副标题：登录渠道 */
export function readerChannelLabel(user: SessionUser): string {
  switch (user.channel) {
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
