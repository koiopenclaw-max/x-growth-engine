import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  useEffect(() => {
    if (session) {
      navigate(from, { replace: true })
    }
  }, [from, navigate, session])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }

      navigate(from, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-glow lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(160deg,_rgba(34,211,238,0.18),_rgba(15,23,42,0.4)_38%,_rgba(8,47,73,0.85))] p-10 lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.18),_transparent_25%),radial-gradient(circle_at_80%_15%,_rgba(125,211,252,0.16),_transparent_22%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-cyan-100">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-300" />
              Content strategy command center
            </div>
            <h1 className="mt-8 max-w-md font-serif text-5xl font-semibold leading-tight text-white">
              Turn posting discipline into repeatable growth.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-200">
              Plan your content pillars, queue posts, and keep performance data in one focused workflow.
            </p>
          </div>
          <div className="relative mt-auto grid gap-4 text-sm text-slate-100">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              Dashboard, calendar, creation flow, analytics, and engagement logging are scaffolded and ready for the next tasks.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/20">
                <span className="text-lg font-semibold text-cyan-300">X</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Platform</p>
                <p className="font-serif text-xl font-semibold text-white">X Growth Engine</p>
              </div>
            </Link>

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-white">
                {mode === 'signin' ? 'Sign in to your workspace' : 'Start with Supabase Auth'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Use your Supabase email/password credentials. Protected routes will redirect here automatically.
              </p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Password</span>
                <input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
                  placeholder="Minimum 6 characters"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button
              type="button"
              className="mt-6 text-sm text-slate-400 transition hover:text-cyan-200"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
