'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToday } from '@/hooks/useToday'
import { isVisibleOn } from '@/lib/todoView'
import type {
  StatusFilter,
  Todo,
  TodoInput,
  TodoType,
  TypeFilter,
} from '@/types/todo'
import TodoForm from './TodoForm'
import TodoItem from './TodoItem'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '미완료' },
  { value: 'completed', label: '완료' },
]

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'TODAY', label: '오늘' },
  { value: 'PERIOD', label: '기간' },
]

export default function TodoApp() {
  const today = useToday()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // 최초 1회 목록 조회. setState 는 모두 await 이후에 호출해
  // 이펙트 내 동기 setState(cascading render)를 피한다.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/todos', { cache: 'no-store' })
        if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
        const data: Todo[] = await res.json()
        if (!cancelled) setTodos(data)
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
  }, [])

  const handleAdd = async (input: TodoInput) => {
    setError(null)
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? '할 일을 추가하지 못했습니다.')
      return
    }

    const created: Todo = await res.json()
    setTodos((prev) => [created, ...prev])
  }

  // 체크/수정/삭제는 낙관적 업데이트로 즉시 반영하고, 실패하면 이전 상태로 되돌린다.
  const handleUpdate = async (
    id: number,
    data: {
      title?: string
      completed?: boolean
      type?: TodoType
      startDate?: string | null
      endDate?: string | null
    }
  ) => {
    setError(null)
    const snapshot = todos
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              ...data,
              // 완료 시각도 함께 반영해야 이월된 항목이 체크 직후
              // 잠깐 목록에서 사라졌다 돌아오지 않는다.
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

  const handleDelete = async (id: number) => {
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

  // 오늘 목록에 보여줄 항목 (미완료 오늘 할 일은 다음 날에도 계속 남는다)
  const todayTodos = useMemo(
    () => todos.filter((t) => isVisibleOn(t, today)),
    [todos, today]
  )

  const visible = useMemo(
    () =>
      typeFilter === 'all'
        ? todayTodos
        : todayTodos.filter((t) => t.type === typeFilter),
    [todayTodos, typeFilter]
  )

  const { active, completed } = useMemo(
    () => ({
      active: visible.filter((t) => !t.completed),
      completed: visible.filter((t) => t.completed),
    }),
    [visible]
  )

  const renderList = (items: Todo[]) => (
    <ul className="flex flex-col gap-2">
      {items.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          today={today}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-6">
      <TodoForm onAdd={handleAdd} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div
            role="group"
            aria-label="종류 필터"
            className="flex gap-1 rounded-lg border border-border bg-card p-1"
          >
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                aria-pressed={typeFilter === f.value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === f.value
                    ? 'bg-sepia text-white'
                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {f.value === 'all' ? '전체 종류' : f.label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="상태 필터"
            className="flex gap-1 rounded-lg border border-border bg-card p-1"
          >
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-ink text-white'
                    : 'text-muted hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-muted">
            미완료 {active.length}개 · 완료 {completed.length}개
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">불러오는 중...</p>
      ) : todos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <p className="font-medium">아직 등록된 할 일이 없습니다.</p>
          <p className="mt-1 text-sm text-muted">
            위 입력창에 할 일을 추가해 보세요.
          </p>
        </div>
      ) : todayTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <p className="font-medium">오늘 표시할 할 일이 없습니다.</p>
          <p className="mt-1 text-sm text-muted">
            지난 날짜에 끝낸 일과 앞날에 적어 둔 일은 목록에 남지 않습니다.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <p className="font-medium">
            선택한 종류의 할 일이 없습니다.
          </p>
          <p className="mt-1 text-sm text-muted">
            다른 종류를 선택하거나 새로 추가해 보세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {statusFilter !== 'completed' && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                미완료 ({active.length})
              </h2>
              {active.length > 0 ? (
                renderList(active)
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  미완료 항목이 없습니다. 🎉
                </p>
              )}
            </section>
          )}

          {statusFilter !== 'active' && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted">
                완료 ({completed.length})
              </h2>
              {completed.length > 0 ? (
                renderList(completed)
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                  완료된 항목이 없습니다.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
