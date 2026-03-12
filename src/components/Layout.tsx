import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  CalendarRange,
  LogOut,
  Menu,
  PenSquare,
  Sparkles,
  X,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

const navigation = [
  { to: '/', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarRange },
  { to: '/create', label: 'Create Post', icon: PenSquare },
  { to: '/analytics', label: 'Analytics', icon: Sparkles },
]

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <aside
          className={[
            'fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="mb-8 flex items-center justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 ring-1 ring-cyan-300/20">
                <span className="text-lg font-semibold text-cyan-300">X</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Platform</p>
                <h1 className="font-serif text-xl font-semibold text-white">X Growth Engine</h1>
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl border border-white/10 p-2 text-slate-300 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glow">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current focus</p>
            <p className="mt-3 text-sm text-slate-200">Build, schedule, and analyze posts without leaving one workspace.</p>
          </div>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <div className="relative flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 px-4 py-4 backdrop-blur xl:px-8">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 p-2 text-slate-300 lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Workspace</p>
                  <p className="text-sm text-slate-200">Manage your X content system</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-100">{user?.email ?? 'Authenticated user'}</p>
                  <p className="text-xs text-slate-400">Supabase Auth session</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
