import DiaryRings from '@/components/DiaryRings'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: '로그인 · MY TODO',
}

// 외부 사이트로 튕겨 보내지 못하도록, 앱 안의 경로만 통과시킨다.
function safeNext(value: string | string[] | undefined) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'

  return value
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10 sm:py-16">
      <div className="diary w-full">
        <DiaryRings />

        <div className="diary-content">
          <header className="mb-6 flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <span role="img" aria-label="다이어리">
                📔
              </span>
              MY TODO
            </h1>
            <p className="text-sm text-muted">
              내 다이어리를 열려면 로그인하세요.
            </p>
          </header>

          <LoginForm next={safeNext(next)} />
        </div>
      </div>
    </main>
  )
}
