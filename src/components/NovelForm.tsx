import { useEffect, useState } from "react";
import type { Novel, NovelInput, ThemeColor } from "@/types";
import { THEME_PALETTES, cn } from "@/lib/utils";

interface NovelFormProps {
  initial?: Novel;
  onSubmit: (input: NovelInput) => void;
  onCancel: () => void;
  submitText?: string;
}

const EXAMPLES = [
  { title: "红楼梦", author: "曹雪芹", synopsis: "贾府兴衰中的儿女情长与世态炎凉。" },
  { title: "三体", author: "刘慈欣", synopsis: "宇宙黑暗森林中，文明的存亡抉择。" },
  { title: "边城", author: "沈从文", synopsis: "湘西小镇翠翠的青涩与守望。" },
];

export function NovelForm({
  initial,
  onSubmit,
  onCancel,
  submitText = "建卷",
}: NovelFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    initial?.themeColor ?? "vermillion",
  );
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setAuthor(initial.author);
      setSynopsis(initial.synopsis);
      setThemeColor(initial.themeColor);
    }
  }, [initial]);

  const valid = title.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      synopsis: synopsis.trim(),
      themeColor,
    });
  };

  const example = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];

  return (
    <div className="flex flex-col">
      <div className="space-y-5">
        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            书名 · TITLE
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`例：${example.title}`}
            className="field-line font-song text-lg"
          />
          {touched && !valid && (
            <p className="text-xs text-vermillion mt-1">书名不可为空。</p>
          )}
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            作者 · AUTHOR
          </label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={`例：${example.author}`}
            className="field-line"
          />
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            内容提要 · SYNOPSIS
          </label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder={`例：${example.synopsis}`}
            rows={3}
            className="w-full bg-transparent border-0 border-b border-ink/20 px-0 py-2 text-ink placeholder:text-ink/35 focus:outline-none focus:border-vermillion transition-colors duration-200 resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] tracking-seal text-ink-mute uppercase">
            主题 · PALETTE
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {THEME_PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setThemeColor(p.key)}
                className={cn(
                  "group relative w-10 h-10 rounded-[2px] flex items-center justify-center transition-all duration-200",
                  themeColor === p.key
                    ? "ring-2 ring-offset-2 ring-offset-paper-soft ring-ink/40 scale-105"
                    : "hover:scale-105",
                )}
                style={{ backgroundColor: p.primary, color: p.text }}
                aria-label={p.label}
                title={p.label}
              >
                <span className="font-song text-sm font-semibold">
                  {p.label[0]}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-mute mt-2">
            主题色将渲染作品的封面与画布点缀。
          </p>
        </div>
      </div>

      <div className="mt-7 flex items-center gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1">
          取消
        </button>
        <button
          onClick={handleSubmit}
          className={cn("btn-primary flex-1", !valid && "opacity-50")}
        >
          {submitText}
        </button>
      </div>
    </div>
  );
}
