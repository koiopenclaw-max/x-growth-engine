import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'

import type { ContentPillar, Post, PostStatus, PostType } from '../types/database'

const POST_TYPES: PostType[] = ['tweet', 'thread', 'reply', 'quote', 'poll']
const STATUSES: PostStatus[] = ['draft', 'scheduled', 'posted', 'archived']

interface PostModalProps {
  isOpen: boolean
  pillars: ContentPillar[]
  initialPost?: Post | null
  saving?: boolean
  error?: string | null
  onClose: () => void
  onSave: (values: Partial<Post>) => Promise<void>
}

interface FormState {
  content: string
  pillar_id: string
  post_type: PostType
  status: PostStatus
  scheduled_for: string
  x_post_url: string
  notes: string
  ai_generated: boolean
}

function toDatetimeInput(value: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toIsoString(value: string) {
  if (!value) {
    return null
  }

  return new Date(value).toISOString()
}

function getInitialState(post?: Post | null): FormState {
  return {
    content: post?.content ?? '',
    pillar_id: post?.pillar_id ?? '',
    post_type: post?.post_type ?? 'tweet',
    status: post?.status ?? 'draft',
    scheduled_for: toDatetimeInput(post?.scheduled_for ?? null),
    x_post_url: post?.x_post_url ?? '',
    notes: post?.notes ?? '',
    ai_generated: post?.ai_generated ?? false,
  }
}

export function PostModal({ isOpen, pillars, initialPost, saving = false, error, onClose, onSave }: PostModalProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(initialPost))
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(getInitialState(initialPost))
    setValidationError(null)
  }, [initialPost, isOpen])

  const isTweet = form.post_type === 'tweet'
  const characterCountTone = useMemo(() => {
    if (!isTweet) {
      return 'text-slate-400'
    }

    return form.content.length > 280 ? 'text-rose-300' : 'text-cyan-300'
  }, [form.content.length, isTweet])

  if (!isOpen) {
    return null
  }

  const handleSubmit = async () => {
    const trimmedContent = form.content.trim()

    if (!trimmedContent) {
      setValidationError('Content is required.')
      return
    }

    if (form.status === 'scheduled' && !form.scheduled_for) {
      setValidationError('Scheduled date and time are required for scheduled posts.')
      return
    }

    setValidationError(null)

    await onSave({
      content: trimmedContent,
      pillar_id: form.pillar_id || null,
      post_type: form.post_type,
      status: form.status,
      scheduled_for:
        form.status === 'scheduled'
          ? toIsoString(form.scheduled_for)
          : form.status === 'draft'
            ? null
            : initialPost?.scheduled_for ?? null,
      x_post_url:
        form.status === 'posted'
          ? form.x_post_url.trim() || null
          : form.status === 'archived'
            ? initialPost?.x_post_url ?? null
            : null,
      notes: form.notes.trim() || null,
      ai_generated: form.ai_generated,
      posted_at:
        form.status === 'posted'
          ? initialPost?.posted_at ?? new Date().toISOString()
          : form.status === 'archived'
            ? initialPost?.posted_at ?? null
            : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-surface-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">
              {initialPost ? 'Edit post' : 'New post'}
            </p>
            <h3 className="mt-2 font-serif text-3xl font-semibold text-white">
              {initialPost ? 'Update calendar entry' : 'Create a new content slot'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10"
            aria-label="Close post modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Content</span>
            <textarea
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              rows={6}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="Draft the post content here."
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">{isTweet ? 'X tweet limit: 280 characters' : 'Character count'}</span>
              <span className={characterCountTone}>{form.content.length}</span>
            </div>
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Pillar</span>
              <select
                value={form.pillar_id}
                onChange={(event) => setForm((current) => ({ ...current, pillar_id: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
              >
                <option value="">No pillar</option>
                {pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Post type</span>
              <select
                value={form.post_type}
                onChange={(event) => setForm((current) => ({ ...current, post_type: event.target.value as PostType }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
              >
                {POST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PostStatus }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.status === 'scheduled' ? (
            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Scheduled for</span>
              <input
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(event) => setForm((current) => ({ ...current, scheduled_for: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
              />
            </label>
          ) : null}

          {form.status === 'posted' ? (
            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">X post URL</span>
              <input
                type="url"
                value={form.x_post_url}
                onChange={(event) => setForm((current) => ({ ...current, x_post_url: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
                placeholder="https://x.com/..."
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="Optional context, hooks, or follow-up notes."
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.ai_generated}
              onChange={(event) => setForm((current) => ({ ...current, ai_generated: event.target.checked }))}
              className="h-4 w-4 rounded border-white/10 bg-slate-950 text-cyan-400 focus:ring-cyan-400"
            />
            AI generated
          </label>

          {validationError || error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {validationError || error}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {initialPost ? 'Save changes' : 'Create post'}
          </button>
        </div>
      </div>
    </div>
  )
}
