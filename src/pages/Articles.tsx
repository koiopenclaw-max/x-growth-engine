import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, LoaderCircle, Plus } from 'lucide-react'

import { useArticles } from '../hooks/useArticles'
import type { ArticleStatus } from '../types/database'

const STATUS_OPTIONS: Array<{ label: string; value: 'all' | ArticleStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getStatusClasses(status: ArticleStatus) {
  if (status === 'published') {
    return 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20'
  }

  if (status === 'archived') {
    return 'bg-slate-400/10 text-slate-300 ring-1 ring-white/10'
  }

  return 'bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20'
}

export default function ArticlesPage() {
  const navigate = useNavigate()
  const { articles, pillars, loading, error, createArticle } = useArticles()
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all')
  const [pillarFilter, setPillarFilter] = useState('all')
  const [isCreating, setIsCreating] = useState(false)

  const filteredArticles = articles.filter((article) => {
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter
    const matchesPillar = pillarFilter === 'all' || article.pillar_id === pillarFilter
    return matchesStatus && matchesPillar
  })

  const createNewArticle = async () => {
    setIsCreating(true)

    try {
      const article = await createArticle({
        title: 'Untitled article',
        content: '',
        status: 'draft',
        outline: [],
        ai_prompts: [],
        ai_generated: false,
        word_count: 0,
      })

      navigate(`/articles/${article.id}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Long-form</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-white">Articles</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Draft, publish, and refine X Articles without leaving the content workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void createNewArticle()}
            disabled={isCreating}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Article
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Status filter</span>
            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2 sm:grid-cols-4">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    statusFilter === option.value ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Pillar filter</span>
            <select
              value={pillarFilter}
              onChange={(event) => setPillarFilter(event.target.value)}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
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

      {loading ? (
        <section className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/80">
          <LoaderCircle className="h-6 w-6 animate-spin text-cyan-300" />
        </section>
      ) : filteredArticles.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredArticles.map((article) => {
            const pillar = pillars.find((entry) => entry.id === article.pillar_id)

            return (
              <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 transition hover:border-cyan-300/30 hover:bg-white/5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${getStatusClasses(article.status)}`}>
                    {article.status}
                  </span>
                  {pillar ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                      {pillar.name}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-5 font-serif text-3xl text-white">{article.title}</h3>
                <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-400">
                  {article.subtitle?.trim() || 'No subtitle yet. Open the editor to shape the article angle.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span>{article.word_count} words</span>
                  <span>{formatDate(article.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-white/10 bg-slate-900/80 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-cyan-400/10 text-cyan-300">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-serif text-3xl text-white">No articles found</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
            {error || 'Change the filters or start a new draft to begin building your long-form library.'}
          </p>
          <button
            type="button"
            onClick={() => void createNewArticle()}
            disabled={isCreating}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Plus className="h-4 w-4" />
            New Article
          </button>
        </section>
      )}
    </div>
  )
}
