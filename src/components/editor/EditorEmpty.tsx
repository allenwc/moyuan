interface EditorEmptyProps {
  onAdd: () => void;
}

/** 无 SVG：避免小程序 plugin-html 缺少 defs/g 模板导致整页结构异常 */
export function EditorEmpty({ onAdd }: EditorEmptyProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center text-center pointer-events-auto px-6">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center animate-seal-press"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(194,162,107,0.35), rgba(163,130,74,0))",
            boxShadow: "inset 0 0 0 1px rgba(163,130,74,0.35)",
          }}
        >
          <span className="font-song text-4xl text-gold opacity-70">缘</span>
        </div>
        <p className="mt-6 font-song text-2xl text-ink">画布尚虚</p>
        <p className="mt-2 text-sm text-ink-mute max-w-[260px] leading-relaxed">
          点击下方「
          <span className="text-vermillion">＋</span>
          」添加一位人物。长按人物节点可向另一位人物发起关系。
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
