import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Bookmark,
  Eye,
  Heart,
  LineChart as LineChartIcon,
  LoaderCircle,
  MessageCircle,
  PencilLine,
  RefreshCw,
  Repeat2,
  Save,
  TrendingUp,
  UserRoundPlus,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAnalytics } from '../hooks/useAnalytics'
import { usePosts } from '../hooks/usePosts'
import type { EngagementLog, EngagementType, Post, PostAnalytics } from '../types/database'

const ACTION_TYPES: EngagementType[] = ['reply', 'quote', 'like', 'retweet', 'follow', 'dm']

const ACTION_STYLES: Record<EngagementType, string> = {
  reply: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  quote: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
  like: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
  retweet: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  follow: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  dm: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
}

const ACTION_LABELS: Record<EngagementType, string> = {
  reply: 'Reply',
  quote: 'Quote',
  like: 'Like',
  retweet: 'Retweet',
  follow: 'Follow',
  dm: 'DM',
}

const ACTION_ICONS: Record<EngagementType, typeof MessageCircle> = {
  reply: MessageCircle,
  quote: PencilLine,
  like: Heart,
  retweet: Repeat2,
  follow: UserRoundPlus,
  dm: MessageCircle,
}

interface SnapshotFormState {
  date: string
  followers: string
  following: string
  totalPosts: string
  impressionsToday: string
  profileVisits: string
  notes: string
}

interface EngagementFormState {
  actionType: EngagementType
  targetAccount: string
  targetPostUrl: string
  notes: string
}

interface PostAnalyticsFormState {
  impressions: string
  likes: string
  retweets: string
  replies: string
  bookmarks: string
  profileClicks: string
  linkClicks: string
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

function parseNumericInput(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '0'
  }

  return new Intl.NumberFormat('en-US').format(value)
}

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '0.00%'
  }

  return `${value.toFixed(2)}%`
}

function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(
    'en-US',
    options ?? {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(new Date(value))
}

function truncateContent(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}

function calculateEngagementRate(values: {
  impressions: number | null
  likes: number | null
  retweets: number | null
  replies: number | null
  bookmarks: number | null
}) {
  const impressions = values.impressions ?? 0
  const totalEngagements =
    (values.likes ?? 0) + (values.retweets ?? 0) + (values.replies ?? 0) + (values.bookmarks ?? 0)

  if (impressions <= 0) {
    return 0
  }

  return Number(((totalEngagements / impressions) * 100).toFixed(2))
}

function toPostAnalyticsFormState(analytics?: PostAnalytics): PostAnalyticsFormState {
  return {
    impressions: analytics?.impressions?.toString() ?? '',
    likes: analytics?.likes?.toString() ?? '',
    retweets: analytics?.retweets?.toString() ?? '',
    replies: analytics?.replies?.toString() ?? '',
    bookmarks: analytics?.bookmarks?.toString() ?? '',
    profileClicks: analytics?.profile_clicks?.toString() ?? '',
    linkClicks: analytics?.link_clicks?.toString() ?? '',
  }
}

function getMostEngagedAccount(logs: EngagementLog[]): { account: string; count: number } | null {
  const counts = new Map<string, number>()

  logs.forEach((entry) => {
    const handle = entry.target_account?.trim()

    if (!handle) {
      return
    }

    counts.set(handle, (counts.get(handle) ?? 0) + 1)
  })

  let winner: { account: string; count: number } | null = null

  counts.forEach((count, account) => {
    if (!winner || count > winner.count) {
      winner = { account, count }
    }
  })

  return winner
}

function isSameUtcDate(dateString: string | null, target: Date) {
  if (!dateString) {
    return false
  }

  const date = new Date(dateString)

  return (
    date.getUTCFullYear() === target.getUTCFullYear() &&
    date.getUTCMonth() === target.getUTCMonth() &&
    date.getUTCDate() === target.getUTCDate()
  )
}

function isWithinLastDays(dateString: string | null, days: number) {
  if (!dateString) {
    return false
  }

  const value = new Date(dateString).getTime()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

  return value >= cutoff
}

export default function AnalyticsPage() {
  const { posts } = usePosts()
  const { snapshots, postAnalytics, engagementLog, loading, error, addSnapshot, upsertPostAnalytics, addEngagement, refetch } =
    useAnalytics()

  const [snapshotForm, setSnapshotForm] = useState<SnapshotFormState>({
    date: getTodayDateInput(),
    followers: '',
    following: '',
    totalPosts: '',
    impressionsToday: '',
    profileVisits: '',
    notes: '',
  })
  const [engagementForm, setEngagementForm] = useState<EngagementFormState>({
    actionType: 'reply',
    targetAccount: '',
    targetPostUrl: '',
    notes: '',
  })
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [postForm, setPostForm] = useState<PostAnalyticsFormState>(toPostAnalyticsFormState())
  const [snapshotSaving, setSnapshotSaving] = useState(false)
  const [engagementSaving, setEngagementSaving] = useState(false)
  const [postSaving, setPostSaving] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const recentSnapshots = useMemo(() => snapshots.slice(0, 7), [snapshots])

  const chartData = useMemo(() => {
    return [...snapshots]
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .map((snapshot) => ({
        date: formatDate(snapshot.date, { month: 'short', day: 'numeric' }),
        followers: snapshot.followers,
      }))
  }, [snapshots])

  const postedPosts = useMemo(() => {
    return posts
      .filter((post) => post.status === 'posted')
      .map((post) => {
        const analytics = postAnalytics.get(post.id)
        const engagementRate = analytics?.engagement_rate ?? 0

        return {
          post,
          analytics,
          engagementRate,
        }
      })
      .sort((left, right) => right.engagementRate - left.engagementRate)
  }, [postAnalytics, posts])

  const recentEngagement = useMemo(() => engagementLog.slice(0, 20), [engagementLog])

  const engagementSummary = useMemo(() => {
    const now = new Date()
    const todayCount = engagementLog.filter((entry) => isSameUtcDate(entry.created_at, now)).length
    const weekCount = engagementLog.filter((entry) => isWithinLastDays(entry.created_at, 7)).length
    const mostEngaged = getMostEngagedAccount(engagementLog)

    return {
      todayCount,
      weekCount,
      mostEngaged,
    }
  }, [engagementLog])

  const handleSnapshotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSnapshotSaving(true)
    setLocalError(null)

    try {
      const followers = parseNumericInput(snapshotForm.followers)
      const following = parseNumericInput(snapshotForm.following)

      if (followers === null || following === null) {
        throw new Error('Followers and following are required.')
      }

      await addSnapshot({
        date: snapshotForm.date,
        followers,
        following,
        total_posts: parseNumericInput(snapshotForm.totalPosts),
        impressions_today: parseNumericInput(snapshotForm.impressionsToday),
        profile_visits: parseNumericInput(snapshotForm.profileVisits),
        notes: snapshotForm.notes.trim() || null,
      })

      setSnapshotForm((current) => ({
        ...current,
        followers: '',
        following: '',
        totalPosts: '',
        impressionsToday: '',
        profileVisits: '',
        notes: '',
      }))
    } catch (submissionError) {
      setLocalError(submissionError instanceof Error ? submissionError.message : 'Unable to save account snapshot.')
    } finally {
      setSnapshotSaving(false)
    }
  }

  const handleEngagementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEngagementSaving(true)
    setLocalError(null)

    try {
      await addEngagement({
        action_type: engagementForm.actionType,
        target_account: engagementForm.targetAccount.trim() || null,
        target_post_url: engagementForm.targetPostUrl.trim() || null,
        notes: engagementForm.notes.trim() || null,
      })

      setEngagementForm({
        actionType: 'reply',
        targetAccount: '',
        targetPostUrl: '',
        notes: '',
      })
    } catch (submissionError) {
      setLocalError(submissionError instanceof Error ? submissionError.message : 'Unable to save engagement activity.')
    } finally {
      setEngagementSaving(false)
    }
  }

  const openPostEditor = (post: Post) => {
    setEditingPostId(post.id)
    setPostForm(toPostAnalyticsFormState(postAnalytics.get(post.id)))
    setLocalError(null)
  }

  const handlePostAnalyticsSubmit = async (event: React.FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault()
    setPostSaving(postId)
    setLocalError(null)

    try {
      const values = {
        impressions: parseNumericInput(postForm.impressions),
        likes: parseNumericInput(postForm.likes),
        retweets: parseNumericInput(postForm.retweets),
        replies: parseNumericInput(postForm.replies),
        bookmarks: parseNumericInput(postForm.bookmarks),
      }

      await upsertPostAnalytics(postId, {
        impressions: values.impressions ?? 0,
        likes: values.likes ?? 0,
        retweets: values.retweets ?? 0,
        replies: values.replies ?? 0,
        bookmarks: values.bookmarks ?? 0,
        profile_clicks: parseNumericInput(postForm.profileClicks) ?? 0,
        link_clicks: parseNumericInput(postForm.linkClicks) ?? 0,
        engagement_rate: calculateEngagementRate(values),
        recorded_at: new Date().toISOString(),
      })

      setEditingPostId(null)
    } catch (submissionError) {
      setLocalError(submissionError instanceof Error ? submissionError.message : 'Unable to save post analytics.')
    } finally {
      setPostSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Analytics</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-white">Track account growth, post results, and daily engagement work.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Phase 1 is manual entry. Save snapshots, compare posted content, and keep a clean log of outbound engagement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh data
          </button>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
            Loading analytics data...
          </div>
        ) : null}

        {error || localError ? (
          <div className="mt-6 rounded-[1.75rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {localError ?? error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account Overview</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Daily snapshot entry</h3>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSnapshotSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Date</span>
                <input
                  type="date"
                  value={snapshotForm.date}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Followers</span>
                <input
                  type="number"
                  min="0"
                  value={snapshotForm.followers}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, followers: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="18250"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Following</span>
                <input
                  type="number"
                  min="0"
                  value={snapshotForm.following}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, following: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="620"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Total Posts</span>
                <input
                  type="number"
                  min="0"
                  value={snapshotForm.totalPosts}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, totalPosts: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="940"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Impressions</span>
                <input
                  type="number"
                  min="0"
                  value={snapshotForm.impressionsToday}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, impressionsToday: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="28400"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Profile Visits</span>
                <input
                  type="number"
                  min="0"
                  value={snapshotForm.profileVisits}
                  onChange={(event) => setSnapshotForm((current) => ({ ...current, profileVisits: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="510"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Notes</span>
              <textarea
                value={snapshotForm.notes}
                onChange={(event) => setSnapshotForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                placeholder="What drove movement today?"
              />
            </label>

            <button
              type="submit"
              disabled={snapshotSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {snapshotSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save snapshot
            </button>
          </form>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent Snapshots</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Last 7 daily records</h3>
            </div>
          </div>

          {recentSnapshots.length === 0 ? (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
              No snapshots saved yet.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Followers</th>
                    <th className="pb-3 pr-4 font-medium">Following</th>
                    <th className="pb-3 pr-4 font-medium">Posts</th>
                    <th className="pb-3 pr-4 font-medium">Impressions</th>
                    <th className="pb-3 font-medium">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSnapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="border-t border-white/5">
                      <td className="py-3 pr-4 text-white">{formatDate(snapshot.date)}</td>
                      <td className="py-3 pr-4">{formatNumber(snapshot.followers)}</td>
                      <td className="py-3 pr-4">{formatNumber(snapshot.following)}</td>
                      <td className="py-3 pr-4">{formatNumber(snapshot.total_posts)}</td>
                      <td className="py-3 pr-4">{formatNumber(snapshot.impressions_today)}</td>
                      <td className="py-3">{formatNumber(snapshot.profile_visits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
            <LineChartIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Follower Growth</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Follower count over time</h3>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
            Add snapshots to render the growth chart.
          </div>
        ) : (
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="followers" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Post Performance</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Posted content sorted by engagement rate</h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {postedPosts.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No posted content yet. Mark posts as posted in the calendar first.
              </div>
            ) : (
              postedPosts.map(({ post, analytics }) => {
                const isEditing = editingPostId === post.id

                return (
                  <article key={post.id} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-sm leading-7 text-white">{truncateContent(post.content)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <span>{post.post_type}</span>
                          <span className="text-slate-600">/</span>
                          <span>{formatDate(post.posted_at)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openPostEditor(post)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                      >
                        <PencilLine className="h-4 w-4" />
                        {analytics ? 'Add/Edit Stats' : 'Add/Edit Stats'}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Impressions</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatNumber(analytics?.impressions)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Likes</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatNumber(analytics?.likes)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Retweets</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatNumber(analytics?.retweets)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Replies</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatNumber(analytics?.replies)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Bookmarks</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formatNumber(analytics?.bookmarks)}</p>
                      </div>
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/70">Eng. Rate</p>
                        <p className="mt-3 text-lg font-semibold text-cyan-200">{formatRate(analytics?.engagement_rate)}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <form className="mt-5 rounded-[1.5rem] border border-cyan-400/20 bg-slate-950/70 p-4" onSubmit={(event) => void handlePostAnalyticsSubmit(event, post.id)}>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Impressions</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.impressions}
                              onChange={(event) => setPostForm((current) => ({ ...current, impressions: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Likes</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.likes}
                              onChange={(event) => setPostForm((current) => ({ ...current, likes: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Retweets</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.retweets}
                              onChange={(event) => setPostForm((current) => ({ ...current, retweets: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Replies</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.replies}
                              onChange={(event) => setPostForm((current) => ({ ...current, replies: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Bookmarks</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.bookmarks}
                              onChange={(event) => setPostForm((current) => ({ ...current, bookmarks: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Profile Clicks</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.profileClicks}
                              onChange={(event) => setPostForm((current) => ({ ...current, profileClicks: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-slate-500">Link Clicks</span>
                            <input
                              type="number"
                              min="0"
                              value={postForm.linkClicks}
                              onChange={(event) => setPostForm((current) => ({ ...current, linkClicks: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/40"
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            disabled={postSaving === post.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {postSaving === post.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save stats
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Engagement Summary</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Today, this week, and strongest target</h3>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total today</p>
                <p className="mt-3 font-serif text-4xl font-semibold text-white">{engagementSummary.todayCount}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total this week</p>
                <p className="mt-3 font-serif text-4xl font-semibold text-white">{engagementSummary.weekCount}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Most engaged account</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {engagementSummary.mostEngaged?.account ?? 'No handle logged yet'}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {engagementSummary.mostEngaged ? `${engagementSummary.mostEngaged.count} actions logged` : 'Add target handles to surface this.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {ACTION_TYPES.map((type) => {
                const Icon = ACTION_ICONS[type]

                return (
                  <span key={type} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] ${ACTION_STYLES[type]}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {ACTION_LABELS[type]}
                  </span>
                )
              })}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200">
                <Bookmark className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Engagement Log</p>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Manual outreach tracking</h3>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleEngagementSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Action Type</span>
                <select
                  value={engagementForm.actionType}
                  onChange={(event) =>
                    setEngagementForm((current) => ({ ...current, actionType: event.target.value as EngagementType }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                >
                  {ACTION_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-slate-900">
                      {ACTION_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Target Account</span>
                <input
                  type="text"
                  value={engagementForm.targetAccount}
                  onChange={(event) => setEngagementForm((current) => ({ ...current, targetAccount: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="@targethandle"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Target Post URL</span>
                <input
                  type="url"
                  value={engagementForm.targetPostUrl}
                  onChange={(event) => setEngagementForm((current) => ({ ...current, targetPostUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="https://x.com/..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-400">Notes</span>
                <textarea
                  rows={3}
                  value={engagementForm.notes}
                  onChange={(event) => setEngagementForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  placeholder="Context, angle, or follow-up idea"
                />
              </label>

              <button
                type="submit"
                disabled={engagementSaving}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {engagementSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Log engagement
              </button>
            </form>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent Activity</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-white">Latest 20 engagement actions</h3>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recentEngagement.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
              No engagement actions logged yet.
            </div>
          ) : (
            recentEngagement.map((entry) => {
              const Icon = ACTION_ICONS[entry.action_type]

              return (
                <article key={entry.id} className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl border p-3 ${ACTION_STYLES[entry.action_type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${ACTION_STYLES[entry.action_type]}`}>
                          {ACTION_LABELS[entry.action_type]}
                        </span>
                        <span className="text-sm text-white">{entry.target_account || 'No handle provided'}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.notes || 'No notes added.'}</p>
                      {entry.target_post_url ? (
                        <a
                          href={entry.target_post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm text-cyan-300 transition hover:text-cyan-200"
                        >
                          View target post
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">
                    {formatDate(entry.created_at, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
