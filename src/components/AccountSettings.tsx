'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ChangePassword from './ChangePassword'
import DeleteAccount from './DeleteAccount'

type Panel = 'none' | 'password' | 'delete'

export default function AccountSettings({ username }: { username: string }) {
  const router = useRouter()
  // 한 번에 하나만 연다. 두 패널이 동시에 펼쳐지면 어느 쪽 비밀번호 칸인지 헷갈린다.
  const [panel, setPanel] = useState<Panel>('none')
  const [changed, setChanged] = useState(false)

  const toggle = (target: Panel) => {
    setChanged(false)
    setPanel((current) => (current === target ? 'none' : target))
  }

  const linkClass =
    'text-sm text-muted underline underline-offset-2 transition-colors'

  return (
    <div className="mt-10 border-t border-border pt-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => toggle('password')}
          aria-expanded={panel === 'password'}
          className={`${linkClass} hover:text-foreground`}
        >
          비밀번호 변경
        </button>

        {/* 되돌릴 수 없는 동작이라 반대쪽 끝에 두어 잘못 누를 여지를 줄인다 */}
        <button
          type="button"
          onClick={() => toggle('delete')}
          aria-expanded={panel === 'delete'}
          className={`${linkClass} hover:text-red-600 dark:hover:text-red-400`}
        >
          계정 삭제
        </button>
      </div>

      {changed && panel === 'none' && (
        <p role="status" className="mt-3 text-sm text-ink-text">
          비밀번호를 바꿨습니다. 다른 기기에 남아 있던 로그인은 모두 해제됩니다.
        </p>
      )}

      {panel === 'password' && (
        <ChangePassword
          onCancel={() => setPanel('none')}
          onDone={() => {
            setPanel('none')
            setChanged(true)
            // 새 쿠키를 받았으므로 서버 쪽 판단을 다시 받아 온다.
            router.refresh()
          }}
        />
      )}

      {panel === 'delete' && (
        <DeleteAccount username={username} onCancel={() => setPanel('none')} />
      )}
    </div>
  )
}
