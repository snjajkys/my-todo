'use client'

import { useEffect, useMemo, useState } from 'react'
import { dateKeysOf } from '@/lib/todoView'
import type { Todo, TodoInput, TodoType } from '@/types/todo'

export type DateRange = { from: string; to: string }

export type TodoPatch = {
  title?: string
  completed?: boolean
  type?: TodoType
  startDate?: string | null
  endDate?: string | null
}

/**
 * 날짜 범위 안의 할 일을 불러오고 고치는 살림살이.
 * 달력(월)과 주간 보기가 같은 API 를 같은 방식으로 쓰므로 한 곳에 모았다.
 *
 * range 가 null 이면 아무것도 하지 않는다. 사용자의 로컬 날짜를 아직 모르는
 * 서버 렌더링 시점이 그렇다. range 는 렌더마다 새로 만들지 말고 memo 해서 넘긴다.
 */
export function useTodoRange(range: DateRange | null) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!range) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/todos?from=${range.from}&to=${range.to}`,
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error('할 일을 불러오지 못했습니다.')

        const data: Todo[] = await res.json()
        if (!cancelled) {
          setTodos(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [range])

  // 어느 날짜 칸에 놓이는지는 dateKeysOf 한 곳에서만 정한다.
  const byDate = useMemo(() => {
    const map = new Map<string, Todo[]>()
    if (!range) return map

    for (const todo of todos) {
      for (const key of dateKeysOf(todo, range.from, range.to)) {
        const list = map.get(key)
        if (list) list.push(todo)
        else map.set(key, [todo])
      }
    }

    // 한 칸 안에서는 미완료를 먼저 보여 준다.
    for (const list of map.values()) {
      list.sort((a, b) => Number(a.completed) - Number(b.completed))
    }

    return map
  }, [todos, range])

  const add = async (input: TodoInput) => {
    setError(null)

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? '할 일을 추가하지 못했습니다.')
      return
    }

    const created: Todo = await res.json()
    setTodos((prev) => [created, ...prev])
  }

  // 체크·수정·삭제는 오늘 화면과 같이 낙관적으로 반영하고, 실패하면 되돌린다.
  const update = async (id: number, data: TodoPatch) => {
    setError(null)
    const snapshot = todos
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...data,
              // 완료 시각이 곧 놓일 자리라, 체크하면 항목이 그 날짜로 옮겨 간다.
              completedAt:
                data.completed === undefined
                  ? t.completedAt
                  : data.completed
                    ? (t.completedAt ?? new Date().toISOString())
                    : null,
            }
          : t
      )
    )

    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setTodos(snapshot)
      setError(body?.error ?? '할 일을 수정하지 못했습니다.')
      return
    }

    const updated: Todo = await res.json()
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const remove = async (id: number) => {
    setError(null)
    const snapshot = todos
    setTodos((prev) => prev.filter((t) => t.id !== id))

    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setTodos(snapshot)
      setError(body?.error ?? '할 일을 삭제하지 못했습니다.')
    }
  }

  return { todos, byDate, loading, error, add, update, remove }
}
