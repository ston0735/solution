import { toast } from "sonner";
import { useSiteContent } from "@/contexts/SiteContentContext";

export function LineIcon({
  className = "h-7 w-7",
  ariaLabel = "LINE",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        fill="currentColor"
        d="M24 5C12.4 5 3 12.5 3 21.8c0 8.3 7.4 15.2 17.3 16.6.7.2 1.6.5 1.8 1.1.2.5.1 1.3.1 1.8l-.3 1.8c-.1.5-.4 2 1.7 1.1 2.1-.9 11.3-6.7 15.4-11.4 2.9-3.2 6-6.7 6-11C45 12.5 35.6 5 24 5Z"
      />
      <g fill="#06C755">
        <path d="M12 16h2.5v9h4.4v2.3H12zM20 16h2.5v11.3H20zM24.5 16h2.4l4.4 6.7V16h2.4v11.3h-2.4l-4.4-6.7v6.7h-2.4zM35.5 16H42v2.3h-4v2.1h3.8v2.3H38V25h4v2.3h-6.5z" />
      </g>
    </svg>
  );
}

export function LineContact({
  floating = false,
  className = "",
  labelOverride,
  floatingBottom,
}: {
  floating?: boolean;
  className?: string;
  labelOverride?: string;
  floatingBottom?: string;
}) {
  const { text } = useSiteContent();
  const url = text("global.lineUrl");
  const label = labelOverride || text("global.lineLabel") || "加入官方Line@";
  const common = floating
    ? "fixed right-5 z-[60] flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-[#06C755] text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-1 active:scale-95 sm:right-7"
    : "inline-flex items-center justify-center gap-3 bg-[#06C755] px-6 py-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#05ae4b] active:scale-[.98]";
  const style = floating
    ? {
        bottom: floatingBottom ?? "max(1.25rem, env(safe-area-inset-bottom))",
      }
    : undefined;
  const content = (
    <>
      <LineIcon
        className={floating ? "h-11 w-11" : "h-7 w-7"}
        ariaLabel={label}
      />
      {!floating && label}
    </>
  );
  if (url)
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${common} ${className}`}
        style={style}
        aria-label={label}
        title={label}
      >
        {content}
      </a>
    );
  return (
    <button
      type="button"
      onClick={() =>
        toast(text("contact.bookingToastTitle"), {
          description: text("contact.bookingToastDescription"),
        })
      }
      className={`${common} ${className}`}
      style={style}
      aria-label={label}
      title={`${label}（連結待設定）`}
    >
      {content}
    </button>
  );
}
