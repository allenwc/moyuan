/**
 * weapp：lucide-react-taro（SVG → Image dataURL，兼容小程序）
 * H5 仍走 uiIcons.tsx → lucide-react
 */
import type { CSSProperties, FC } from "react";
import {
  Search,
  Plus,
  SquarePen,
  Copy,
  Download,
  Trash2,
  Ellipsis,
  Users,
  GitBranch,
  ArrowLeft,
  Undo2,
  Redo2,
  Minus,
  CirclePlus,
  Locate,
  LayoutGrid,
  Link2,
  UserPlus,
  X,
} from "lucide-react-taro";

type IconProps = {
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  color?: string;
  size?: number | string;
  "aria-hidden"?: boolean | "true" | "false";
};

type TaroIcon = FC<{
  className?: string;
  strokeWidth?: number | string;
  style?: CSSProperties;
  color?: string;
  size?: number | string;
}>;

const SIZE_FROM_CLASS: Record<string, number> = {
  "w-3": 12,
  "w-3.5": 14,
  "w-4": 16,
  "w-5": 20,
  "w-6": 24,
};

/** Image 无法继承 currentColor，从 Tailwind text-* 映射设计色 */
const COLOR_FROM_CLASS: Record<string, string> = {
  "text-ink": "#1f1b16",
  "text-ink-soft": "#3a3530",
  "text-ink-mute": "#6b6359",
  "text-ink-wash": "#a39a8b",
  "text-paper-soft": "#faf6ec",
  "text-paper": "#f5efe2",
  "text-vermillion": "#a8322d",
};

const DEFAULT_INK = "#1f1b16";

function tokens(className?: string): string[] {
  return className ? className.split(/\s+/).filter(Boolean) : [];
}

function resolveSize(className?: string, size?: number | string): number | string {
  if (size != null) return size;
  for (const t of tokens(className)) {
    if (SIZE_FROM_CLASS[t] != null) return SIZE_FROM_CLASS[t];
  }
  return 16;
}

function resolveColor(className?: string, color?: string): string {
  if (color) return color;
  for (const t of tokens(className)) {
    if (COLOR_FROM_CLASS[t]) return COLOR_FROM_CLASS[t];
  }
  return DEFAULT_INK;
}

function wrap(Icon: TaroIcon) {
  return function WeappIcon({
    className,
    strokeWidth = 1.6,
    style,
    color,
    size,
    ...rest
  }: IconProps) {
    return (
      <Icon
        className={className}
        strokeWidth={strokeWidth}
        style={style}
        size={resolveSize(className, size)}
        color={resolveColor(className, color)}
        {...rest}
      />
    );
  };
}

export const IconSearch = wrap(Search);
export const IconPlus = wrap(Plus);
export const IconEdit = wrap(SquarePen);
export const IconCopy = wrap(Copy);
export const IconDownload = wrap(Download);
export const IconTrash = wrap(Trash2);
export const IconMore = wrap(Ellipsis);
export const IconUsers = wrap(Users);
export const IconGitBranch = wrap(GitBranch);
export const IconArrowLeft = wrap(ArrowLeft);
export const IconUndo = wrap(Undo2);
export const IconRedo = wrap(Redo2);
export const IconMinus = wrap(Minus);
export const IconPlusCircle = wrap(CirclePlus);
export const IconLocate = wrap(Locate);
export const IconLayoutGrid = wrap(LayoutGrid);
export const IconLink = wrap(Link2);
export const IconUserPlus = wrap(UserPlus);
export const IconX = wrap(X);
