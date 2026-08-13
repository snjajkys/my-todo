'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const handleClick = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      await fetch('/api/login', { method: 'DELETE' })
      router.replace('/login')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
    >
      로그아웃
    </button>
  )
}
