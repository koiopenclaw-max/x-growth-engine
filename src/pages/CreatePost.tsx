import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LoaderCircle, Sparkles, Wand2 } from 'lucide-react'

import { usePosts } from '../hooks/usePosts'
import { generatePost } from '../lib/api'
import type { ContentPillar, PostType } from '../types/database'

const POST_TYPES: PostType[] = ['tweet', 'thread', 'reply', 'quote', 'poll']
const TONES = ['', 'witty', 'professional', 'casual', 'provocative'] as const

type ToneOption = (typeof TONES)[number]

interface GenerationFormState {
  pillarId: string
  postType: PostType
  topic: string
  tone: ToneOption
  context: string
}

function normalizeColor(value: string | null, fallbackIndex: number) {
  if (value?.trim()) {
    return value
  }

  const fallbackPalette = ['#67e8f9', '#38bdf8', '#34d399', '#fbbf24', '#f472b6', '#a78bfa']
  return fallbackPalette[fallbackIndex % fallbackPalette.length]
}

function toDatetimeInput(value: Date) {
  const offset = value.getTimezoneOffset()
  const localDate = new Date(value.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toIsoString(value: string) {
  return new Date(value).toISOString()
}

function getCharacterTone(length: number) {
  if (length > 280) {
    return 'text-rose-300'
  }

  if (length >= 250) {
    return 'text-amber-300'
  }

  return 'text-emerald-300'
}

function getPillarSummary(pillar: ContentPillar | undefined) {
  if (!pillar) {
    return 'Choose a content pillar to align the draft with your calendar mix.'
  }

  return pillar.description || `Target mix: ${pillar.target_percentage ?? 0}% of your content plan.`
}

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { pillars, loading, error, createPost } = usePosts()
  const scheduleInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState<GenerationFormState>({
    pillarId: '',
    postType: 'tweet',
    topic: '',
    tone: '',
    context: '',
  })
  const [generatedContent, setGeneratedContent] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [scheduleFor, setScheduleFor] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSavingScheduled, setIsSavingScheduled] = useState(false)

  const decoratedPillars = useMemo(
    () => pillars.map((pillar, index) => ({ ...pillar, resolvedColor: normalizeColor(pillar.color, index) })),
    [pillars],
  )

  const selectedPillar = useMemo(
    () => decoratedPillars.find((pillar) => pillar.id === form.pillarId),
    [decoratedPillars, form.pillarId],
  )

  const canGenerate = Boolean(form.pillarId && form.topic.trim())
  const canSave = Boolean(generatedContent.trim() && form.pillarId)
  const characterTone = getCharacterTone(generatedContent.length)

  useEffect(() => {
    if (scheduleOpen && !scheduleFor) {
      setScheduleFor(toDatetimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)))
    }
  }, [scheduleFor, scheduleOpen])

  const runGeneration = async () => {
    if (!selectedPillar) {
      setGenerateError('Choose a content pillar before generating.')
      return
    }

    if (!form.topic.trim()) {
      setGenerateError('Add a topic or prompt before generating.')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)
    setSaveError(null)
    setSuccessMessage(null)

    try {
      const result = await generatePost({
        pillar: selectedPillar.name,
        post_type: form.postType,
        topic: form.topic.trim(),
        tone: form.tone || undefined,
        context: form.context.trim() || undefined,
      })

      setGeneratedContent(result.content)
      setSuggestions(result.suggestions ?? [])
      setScheduleOpen(false)
    } catch (generationError) {
      setGenerateError(generationError instanceof Error ? generationError.message : 'Unable to generate AI content.')
    } finally {
      setIsGenerating(false)
    }
  }

  const savePost = async (mode: 'draft' | 'scheduled') => {
    if (!selectedPillar) {
      setSaveError('Choose a pillar before saving.')
      return
    }

    if (!generatedContent.trim()) {
      setSaveError('Generate or enter content before saving.')
      return
    }

    if (mode === 'scheduled' && !scheduleFor) {
      setSaveError('Choose a date and time before scheduling this post.')
      return
    }

    setSaveError(null)
    setGenerateError(null)
    setSuccessMessage(null)

    if (mode === 'draft') {
      setIsSavingDraft(true)
    } else {
      setIsSavingScheduled(true)
    }

    try {
      await createPost({
        pillar_id: selectedPillar.id,
        content: generatedContent.trim(),
        post_type: form.postType,
        status: mode,
        scheduled_for: mode === 'scheduled' ? toIsoString(scheduleFor) : null,
        ai_generated: true,
        ai_prompt: form.topic.trim(),
        notes: form.context.trim() || null,
      })

      setSuccessMessage(mode === 'draft' ? 'Draft saved to the calendar.' : 'Post saved and scheduled.')
      navigate('/calendar')
    } catch (creationError) {
      setSaveError(creationError instanceof Error ? creationError.message : 'Unable to save post.')
    } finally {
      setIsSavingDraft(false)
      setIsSavingScheduled(false)
    }
  }

  const handleScheduleClick = () => {
    setSuccessMessage(null)
    setScheduleOpen(true)

    window.setTimeout(() => {
      scheduleInputRef.current?.showPicker?.()
      scheduleInputRef.current?.focus()
    }, 0)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">AI Content Generator</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-white">Generate a draft, refine it, and drop it into the calendar.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Build AI-assisted posts for @KoiNov1 without exposing the Claude API key in the browser.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Step 1: Configure generation
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {decoratedPillars.map((pillar) => {
                const isSelected = pillar.id === form.pillarId

                return (
                  <button
                    key={pillar.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, pillarId: pillar.id }))}
                    className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      isSelected
                        ? 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pillar.resolvedColor }} />
                        {pillar.name}
                      </span>
                      {pillar.target_percentage ? (
                        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-xs text-slate-300">
                          {pillar.target_percentage}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{pillar.description || 'No description provided.'}</p>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-slate-400">{getPillarSummary(selectedPillar)}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Post type</span>
              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
                {POST_TYPES.map((type) => {
                  const isActive = form.postType === type

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, postType: type }))}
                      className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                        isActive ? 'bg-cyan-400 text-slate-950' : 'bg-transparent text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  )
                })}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Tone</span>
              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
                {TONES.map((tone) => {
                  const label = tone || 'default'
                  const isActive = form.tone === tone

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, tone }))}
                      className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                        isActive ? 'bg-cyan-400 text-slate-950' : 'bg-transparent text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Topic / prompt</span>
            <textarea
              value={form.topic}
              onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
              rows={5}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="What do you want to post about?"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Additional context</span>
            <textarea
              value={form.context}
              onChange={(event) => setForm((current) => ({ ...current, context: event.target.value }))}
              rows={4}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="Optional supporting details, CTA, links, or constraints for Claude."
            />
          </label>

          {error || generateError ? (
            <div className="rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {generateError || error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void runGeneration()}
            disabled={loading || isGenerating || !canGenerate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate with AI
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-slate-400">
              <CalendarDays className="h-4 w-4 text-cyan-300" />
              Step 2: Review & edit
            </div>
            <h3 className="mt-3 font-serif text-3xl font-semibold text-white">Refine the generated draft before it hits the calendar.</h3>
          </div>
          <div className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium ${characterTone}`}>
            {generatedContent.length}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Generated content</span>
            <textarea
              value={generatedContent}
              onChange={(event) => {
                setGeneratedContent(event.target.value)
                setSuccessMessage(null)
              }}
              rows={18}
              className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="Your AI draft will appear here. You can edit it before saving."
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {form.postType === 'thread' ? 'Threads can exceed 280 total characters. Numbered tweets are expected.' : 'Green <250, yellow 250-270, red >280.'}
              </span>
              <span className={characterTone}>{generatedContent.length} characters</span>
            </div>
          </label>

          <div>
            <div className="mb-2 text-sm uppercase tracking-[0.2em] text-slate-400">AI suggestions</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setGeneratedContent(suggestion)
                      setSuccessMessage(null)
                    }}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-left text-sm text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                  >
                    {suggestion}
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">Alternative hooks will appear here after generation.</p>
              )}
            </div>
          </div>

          {scheduleOpen ? (
            <label className="block">
              <span className="mb-2 block text-sm uppercase tracking-[0.2em] text-slate-400">Schedule for</span>
              <input
                ref={scheduleInputRef}
                type="datetime-local"
                value={scheduleFor}
                onChange={(event) => setScheduleFor(event.target.value)}
                className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
              />
            </label>
          ) : null}

          {saveError ? (
            <div className="rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{saveError}</div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={isGenerating || !canGenerate}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Regenerate
            </button>

            <button
              type="button"
              onClick={() => void savePost('draft')}
              disabled={isSavingDraft || isSavingScheduled || !canSave}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingDraft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => {
                if (!scheduleOpen) {
                  handleScheduleClick()
                  return
                }

                void savePost('scheduled')
              }}
              disabled={isSavingDraft || isSavingScheduled || !canSave}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingScheduled ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              {scheduleOpen ? 'Confirm Schedule' : 'Save & Schedule'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
