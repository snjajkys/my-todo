import DiaryRings from '@/components/DiaryRings'
import SignupForm from '@/components/SignupForm'

export const metadata = {
  title: '가입 · MY TODO',
}

export default function SignupPage() {
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
              초대 코드로 내 다이어리를 만듭니다. 할 일은 나에게만 보입니다.
            </p>
          </header>

          <SignupForm />

          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted">
            비밀번호는 다시 볼 수 없게 저장되므로, 잊으면 되찾을 수 없습니다.
            따로 적어 두세요.
          </p>
        </div>
      </div>
    </main>
  )
}
