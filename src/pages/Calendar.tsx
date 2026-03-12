import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CircleDot,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'

import { DeleteConfirm } from '../components/DeleteConfirm'
import { PostModal } from '../components/PostModal'
import { usePosts } from '../hooks/usePosts'
import type { ContentPillar, Post, PostStatus } from '../types/database'

const STATUS_FILTERS: Array<{ value: 'all' | PostStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'posted', label: 'Posted' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: 'border-white/10 bg-slate-800 text-slate-300',
  scheduled: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  posted: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  archived: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
}

const POST_TYPE_STYLES: Record<Post['post_type'], string> = {
  tweet: 'border-white/10 bg-white/5 text-slate-200',
  thread: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200',
  reply: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  quote: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  poll: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return 'Unscheduled'
  }

  const date = new Date(value)

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function normalizeColor(value: string | null, fallbackIndex: number) {
  if (value?.trim()) {
    return value
  }

  const fallbackPalette = ['#67e8f9', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']
  return fallbackPalette[fallbackIndex % fallbackPalette.length]
}

function getQuickActions(post: Post) {
  const actions: Array<{ label: string; status?: PostStatus; requiresSchedule?: boolean }> = []

  if (post.status === 'draft') {
    actions.push({ label: 'Schedule', status: 'scheduled', requiresSchedule: true })
  }

  if (post.status === 'scheduled') {
    actions.push({ label: 'Mark posted', status: 'posted' })
  }

  if (post.status === 'posted') {
    actions.push({ label: 'Archive', status: 'archived' })
  }

  if (post.status !== 'draft') {
    actions.push({ label: 'Reset to draft', status: 'draft' })
  }

  return actions
}

export default function CalendarPage() {
  const { posts, pillars, loading, error, createPost, updatePost, deletePost, refetch } = usePosts()
  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all')
  const [pillarFilter, setPillarFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const pillarMap = useMemo(() => {
    return new Map(pillars.map((pillar, index) => [pillar.id, { ...pillar, resolvedColor: normalizeColor(pillar.color, index) }]))
  }, [pillars])

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false
      }

      if (pillarFilter !== 'all' && post.pillar_id !== pillarFilter) {
        return false
      }

      return true
    })
  }, [pillarFilter, posts, statusFilter])

  const groupedPosts = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; posts: Post[] }> = []
    const map = new Map<string, Post[]>()

    filteredPosts.forEach((post) => {
      const key = post.scheduled_for ?? post.created_at ?? 'unscheduled'
      const existing = map.get(key)

      if (existing) {
        existing.push(post)
        return
      }

      map.set(key, [post])
      groups.push({ dateKey: key, label: formatDateLabel(post.scheduled_for ?? post.created_at), posts: map.get(key) ?? [] })
    })

    return groups
  }, [filteredPosts])

  const distribution = useMemo(() => {
    const counts = new Map<string, number>()

    filteredPosts.forEach((post) => {
      if (!post.pillar_id) {
        return
      }

      counts.set(post.pillar_id, (counts.get(post.pillar_id) ?? 0) + 1)
    })

    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0)

    return pillars
      .map((pillar, index) => {
        const count = counts.get(pillar.id) ?? 0
        const percentage = total > 0 ? (count / total) * 100 : 0

        return {
          pillar,
          count,
          percentage,
          color: normalizeColor(pillar.color, index),
        }
      })
      .filter((item) => item.count > 0)
  }, [filteredPosts, pillars])

  const openCreateModal = () => {
    setActivePost(null)
    setModalError(null)
    setModalOpen(true)
  }

  const openEditModal = (post: Post) => {
    setActivePost(post)
    setModalError(null)
    setModalOpen(true)
  }

  const handleSave = async (values: Partial<Post>) => {
    setSaving(true)
    setModalError(null)

    try {
      if (activePost) {
        await updatePost(activePost.id, values)
      } else {
        await createPost(values)
      }

      setModalOpen(false)
      setActivePost(null)
    } catch (saveError) {
      setModalError(saveError instanceof Error ? saveError.message : 'Unable to save post.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)

    try {
      await deletePost(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (
    post: Post,
    nextStatus: PostStatus,
    options?: { requiresSchedule?: boolean },
  ) => {
    if (options?.requiresSchedule && !post.scheduled_for) {
      openEditModal(post)
      setModalError('Add a scheduled date and time before moving this post to scheduled.')
      return
    }

    const updates: Partial<Post> = {
      status: nextStatus,
      scheduled_for: nextStatus === 'draft' ? null : post.scheduled_for,
      posted_at: nextStatus === 'posted' ? new Date().toISOString() : nextStatus === 'draft' ? null : post.posted_at,
    }

    if (nextStatus === 'draft') {
      updates.x_post_url = null
    }

    await updatePost(post.id, updates)
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Content Calendar</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold text-white">Plan, queue, and manage every post.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Filter by status or pillar, move posts through the publishing lifecycle, and keep the schedule readable.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Pillar distribution</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Current mix across visible posts</h3>
              </div>
              <p className="text-sm text-slate-400">{filteredPosts.length} posts in view</p>
            </div>

            <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-950/70">
              {distribution.length > 0 ? (
                <div className="flex h-full w-full">
                  {distribution.map((item) => (
                    <div
                      key={item.pillar.id}
                      className="h-full"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-full w-full bg-white/5" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {distribution.length > 0 ? (
                distribution.map((item) => (
                  <div key={item.pillar.id} className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 text-white">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.pillar.name}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {Math.round(item.percentage)}% • {item.count} posts
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No pillar distribution yet for the current filters.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const isActive = statusFilter === filter.value

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <span className="uppercase tracking-[0.2em] text-slate-500">Pillar</span>
              <select
                value={pillarFilter}
                onChange={(event) => setPillarFilter(event.target.value)}
                className="bg-transparent text-slate-100 outline-none"
              >
                <option value="all">All pillars</option>
                {pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
              <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
              Loading calendar posts...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[2rem] border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-200">{error}</div>
          ) : null}

          {!loading && groupedPosts.length === 0 ? (
            <section className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/80 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-cyan-400/10 text-cyan-300">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-serif text-3xl font-semibold text-white">No posts match these filters</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Adjust the current status or pillar filters, or create a new post to start filling the calendar.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </button>
            </section>
          ) : null}

          {!loading &&
            groupedPosts.map((group) => (
              <section key={group.dateKey} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{group.label}</p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid gap-4">
                  {group.posts.map((post) => {
                    const pillar = post.pillar_id ? pillarMap.get(post.pillar_id) : null

                    return (
                      <article
                        key={post.id}
                        className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 transition hover:border-cyan-300/20"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[post.status]}`}>
                                {post.status}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${POST_TYPE_STYLES[post.post_type]}`}
                              >
                                {post.post_type}
                              </span>
                              {pillar ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                                  <CircleDot className="h-3.5 w-3.5" style={{ color: pillar.resolvedColor }} />
                                  {pillar.name}
                                </span>
                              ) : (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-400">
                                  No pillar
                                </span>
                              )}
                            </div>

                            <p
                              className="mt-4 text-base leading-7 text-slate-100"
                              style={{
                                display: '-webkit-box',
                                overflow: 'hidden',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                              }}
                            >
                              {post.content}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                              <span>Scheduled: {formatDateTime(post.scheduled_for)}</span>
                              <span>Created: {formatDateTime(post.created_at)}</span>
                              {post.x_post_url ? (
                                <a
                                  href={post.x_post_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-300 transition hover:text-cyan-200"
                                >
                                  View X post
                                </a>
                              ) : null}
                              {post.ai_generated ? <span>AI generated</span> : null}
                            </div>

                            {post.notes ? <p className="mt-4 text-sm leading-6 text-slate-400">{post.notes}</p> : null}
                          </div>

                          <div className="flex flex-col gap-3 xl:w-64">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(post)}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(post)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getQuickActions(post).map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  onClick={() => void handleStatusChange(post, action.status ?? post.status, action)}
                                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-200"
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
        </section>
      </div>

      <PostModal
        isOpen={modalOpen}
        pillars={pillars as ContentPillar[]}
        initialPost={activePost}
        saving={saving}
        error={modalError}
        onClose={() => {
          setModalOpen(false)
          setActivePost(null)
          setModalError(null)
        }}
        onSave={handleSave}
      />

      <DeleteConfirm
        isOpen={deleteTarget !== null}
        loading={deleting}
        description="This will permanently remove the post from the content calendar."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
