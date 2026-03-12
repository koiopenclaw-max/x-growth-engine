import { AlertTriangle, LoaderCircle } from 'lucide-react'

interface DeleteConfirmProps {
  isOpen: boolean
  title?: string
  description?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirm({
  isOpen,
  title = 'Delete post?',
  description = 'This action cannot be undone.',
  loading = false,
  onCancel,
  onConfirm,
}: DeleteConfirmProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-surface-950 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300/80">Confirm deletion</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Delete post
          </button>
        </div>
      </div>
    </div>
  )
}
