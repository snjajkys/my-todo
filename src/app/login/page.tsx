import DiaryRings from '@/components/DiaryRings'
import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: '로그인 · MY TODO',
}

// 외부 사이트로 튕겨 보내지 못하도록, 앱 안의 경로만 통과시킨다.
function safeNext(value: string | string[] | undefined) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'

  // 관리 화면은 볼 수 있는 사람이 정해져 있는데, 로그인하기 전에는 그게 누구인지
  // 알 수 없다. 그대로 보내면 관리자가 아닌 사람이 로그인하자마자 404 를 만난다.
  // 브라우저가 그 주소를 기록에서 되살리면 열 때마다 반복된다.
  // 관리자는 홈의 "관리" 링크로 들어가면 되므로, 여기서는 홈으로 보낸다.
  if (value === '/admin' || value.startsWith('/admin/')) return '/'

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
