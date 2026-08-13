import Link from 'next/link'
import { notFound } from 'next/navigation'
import AdminAccountRow from '@/components/AdminAccountRow'
import DiaryRings from '@/components/DiaryRings'
import { getAdminUser, listAccounts } from '@/lib/admin'

export const metadata = {
  title: '관리 · MY TODO',
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(value)
}

export default async function AdminPage() {
  const admin = await getAdminUser()

  // 관리자가 아니면 화면의 존재 자체를 알려주지 않는다.
  if (!admin) notFound()

  const accounts = await listAccounts()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8 sm:py-12">
      <div className="diary">
        <DiaryRings />

        <div className="diary-content">
          <header className="mb-6 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight">계정 관리</h1>
              <Link
                href="/"
                className="text-sm text-muted underline underline-offset-2 hover:text-foreground"
              >
                내 다이어리로
              </Link>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              비밀번호를 잊은 사람에게 임시 비밀번호를 발급합니다. 할 일 내용은
              보이지 않고 개수만 표시됩니다.
            </p>
          </header>

          <ul className="flex flex-col gap-3">
            {accounts.map((account) => (
              <AdminAccountRow
                key={account.id}
                id={account.id}
                username={account.username}
                createdAt={formatDate(account.createdAt)}
                todoCount={account._count.todos}
                isSelf={account.id === admin.id}
              />
            ))}
          </ul>

          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-xs leading-relaxed text-muted">
            재설정하면 그 사람이 다른 기기에 남겨 둔 로그인은 모두 해제됩니다.
            임시 비밀번호는 발급 직후 한 번만 보여지므로, 그 자리에서 전달해 주세요.
          </p>
        </div>
      </div>
    </main>
  )
}
