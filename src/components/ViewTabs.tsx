import Link from "next/link";

export type ViewKey = "today" | "week" | "calendar";

// 순서는 좁은 기간 -> 넓은 기간. 어느 화면에서 보든 같은 차례로 놓인다.
const VIEWS: { key: ViewKey; href: string; icon: string; label: string }[] = [
  { key: "today", href: "/", icon: "📔", label: "오늘 할 일" },
  { key: "week", href: "/week", icon: "📅", label: "주간 할 일" },
  { key: "calendar", href: "/calendar", icon: "🗓️", label: "달력 보기" },
];

/**
 * 큰 제목 바로 아래에 놓이는 화면 이동 줄.
 * 지금 보고 있는 화면은 빼고 나머지만 보여 준다.
 */
export default function ViewTabs({ current }: { current: ViewKey }) {
  return (
    <div className="flex flex-wrap gap-2">
      {VIEWS.filter((view) => view.key !== current).map((view) => (
        <Link
          key={view.key}
          href={view.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink-text transition hover:bg-ink-soft"
        >
          <span role="img" aria-hidden>
            {view.icon}
          </span>
          {view.label}
        </Link>
      ))}
    </div>
  );
}
