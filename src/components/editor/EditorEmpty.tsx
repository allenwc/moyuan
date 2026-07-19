interface EditorEmptyProps {
  onAdd: () => void;
}

export function EditorEmpty({ onAdd }: EditorEmptyProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center text-center pointer-events-auto px-6">
        <div className="relative">
          <svg viewBox="0 0 120 120" className="w-32 h-32 animate-seal-press">
            <defs>
              <radialGradient id="emptyG" cx="50%" cy="40%">
                <stop offset="0%" stopColor="#c2a26b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a3824a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#emptyG)" />
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="#a3824a"
              strokeWidth="0.8"
              strokeDasharray="2 3"
              opacity="0.6"
            />
            <text
              x="60"
              y="68"
              textAnchor="middle"
              fontFamily='"Ma Shan Zheng", "Noto Serif SC", serif'
              fontSize="36"
              fill="#a3824a"
              opacity="0.6"
            >
              缘
            </text>
          </svg>
        </div>
        <p className="mt-6 font-song text-2xl text-ink">画布尚虚</p>
        <p className="mt-2 text-sm text-ink-mute max-w-[260px] leading-relaxed">
          点击下方「<span className="text-vermillion">＋</span>」添加一位人物。
          长按人物节点可向另一位人物发起关系。
        </p>
        <button onClick={onAdd} className="btn-primary mt-6">
          添加第一位人物
        </button>
        <p className="mt-4 text-[11px] text-ink-mute tracking-editorial">
          双指捏合可缩放 · 单指拖拽可平移
        </p>
      </div>
    </div>
  );
}
