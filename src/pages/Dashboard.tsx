import { Link } from 'react-router-dom'
import { Activity, CalendarDays, FileText, PencilLine } from 'lucide-react'

import { useArticles } from '../hooks/useArticles'

const quickActions = [
  { to: '/create', label: 'Create Post', icon: PencilLine },
  { to: '/articles', label: 'Open Articles', icon: FileText },
  { to: '/calendar', label: 'View Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Log Engagement', icon: Activity },
]

export default function DashboardPage() {
  const { articles, analytics } = useArticles()
  const publishedArticles = articles.filter((article) => article.status === 'published').length
  const totalReads = analytics.reduce((sum, entry) => sum + entry.reads, 0)

  const stats = [
    { label: 'Posts in pipeline', value: '0', hint: 'Drafts and scheduled posts will appear here.' },
    { label: 'Published articles', value: String(publishedArticles), hint: 'Long-form pieces currently live on X.' },
    { label: 'Article reads', value: String(totalReads), hint: 'Combined reads across all tracked articles.' },
    { label: 'Engagement actions logged', value: '0', hint: 'Replies, follows, and DMs will roll up here.' },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Dashboard</p>
        <h2 className="mt-3 font-serif text-4xl font-semibold text-white">Welcome to your growth workspace.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          The frontend foundation is in place. Next tasks can wire live Supabase data into these cards, actions,
          and views.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-4 font-serif text-4xl font-semibold text-white">{stat.value}</p>
            <p className="mt-4 text-sm leading-6 text-slate-400">{stat.hint}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Quick actions</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Jump into the workflow</h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Use these placeholders to move through the app while the data features are added.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
            >
              <Icon className="h-5 w-5 text-cyan-300 transition group-hover:translate-x-0.5" />
              <p className="mt-4 text-lg font-medium text-white">{label}</p>
              <p className="mt-2 text-sm text-slate-400">Open the placeholder screen and continue building from there.</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
