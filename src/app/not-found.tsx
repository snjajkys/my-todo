import Link from 'next/link'
import DiaryRings from '@/components/DiaryRings'

export const metadata = {
  title: '찾을 수 없음 · MY TODO',
}

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10 sm:py-16">
      <div className="diary w-full">
        <DiaryRings />

        <div className="diary-content">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span role="img" aria-label="다이어리">
              📔
            </span>
            찾을 수 없는 쪽이에요
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            주소가 바뀌었거나, 볼 수 있는 권한이 없는 쪽일 수 있습니다.
          </p>

          {/* 기본 404 는 돌아갈 길이 없어, 모바일에서는 주소창을 고치는 수밖에 없었다.
              어느 상황에서든 한 번에 빠져나올 수 있게 링크를 둔다. */}
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-strong"
          >
            내 다이어리로
          </Link>
        </div>
      </div>
    </main>
  )
}
