import { ArrowLeftRight } from "lucide-react";

type ABCompareProps = {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  alt?: string;
  className?: string;
};

export default function ABCompare({
  beforeUrl,
  afterUrl,
  beforeLabel = "A ORIGINAL",
  afterLabel = "B AI PREVIEW",
  alt = "A｜B 圖片比較",
  className = "",
}: ABCompareProps) {
  return (
    <div
      className={`group relative h-full w-full overflow-hidden bg-[#080908] ${className}`}
    >
      <img
        src={afterUrl}
        alt={`${alt}・${afterLabel}`}
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />
      <div
        data-ab-overlay
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        style={{ clipPath: "inset(0 50% 0 0)" }}
      >
        <img
          src={beforeUrl}
          alt={`${alt}・${beforeLabel}`}
          className="absolute inset-0 h-full w-full select-none object-cover"
          draggable={false}
        />
      </div>
      <div
        data-ab-divider
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        style={{ left: "50%" }}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#263852]/90 text-white shadow-xl backdrop-blur-sm">
          <ArrowLeftRight size={22} strokeWidth={1.7} />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-12">
        <span className="border border-white/30 bg-black/55 px-2 py-1 text-[0.56rem] font-bold tracking-[0.13em] text-white/90 backdrop-blur-sm">
          {beforeLabel}
        </span>
        <span className="border border-[#a9ff44]/60 bg-black/55 px-2 py-1 text-[0.56rem] font-bold tracking-[0.13em] text-[#a9ff44] backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue="50"
        aria-label="拖曳 A｜B 比較分割線"
        className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
        onChange={event => {
          const position = Number(event.target.value);
          const root = event.currentTarget.parentElement;
          if (!root) return;
          root
            .querySelector<HTMLElement>("[data-ab-overlay]")
            ?.style.setProperty("clip-path", `inset(0 ${100 - position}% 0 0)`);
          root
            .querySelector<HTMLElement>("[data-ab-divider]")
            ?.style.setProperty("left", `${position}%`);
        }}
      />
    </div>
  );
}
