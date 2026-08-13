import { redirect } from 'next/navigation'
import DiaryRings from '@/components/DiaryRings'
import SetupForm from '@/components/SetupForm'
import { isPasswordRegistered } from '@/lib/password'

export const metadata = {
  title: '비밀번호 등록 · MY TODO',
}

export default async function SetupPage() {
  // 등록은 최초 1회뿐이다. 이미 끝났으면 이 화면을 보여주지 않는다.
  if (await isPasswordRegistered()) {
    redirect('/login')
  }

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
              처음 오셨네요. 이 다이어리를 잠글 비밀번호를 정해 주세요.
            </p>
          </header>

          <SetupForm />

          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted">
            비밀번호는 다시 볼 수 없게 저장되므로, 잊으면 되찾을 수 없습니다.
            따로 적어 두세요.
          </p>
        </div>
      </div>
    </main>
  )
}
