import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Bot,
  FileText,
  LoaderCircle,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

import { DeleteConfirm } from '../components/DeleteConfirm'
import { MarkdownPreview, PreviewModal } from '../components/MarkdownPreview'
import { useArticles } from '../hooks/useArticles'
import {
  generateArticle,
  type GenerateArticleHookResult,
  type GenerateArticleOutlineResult,
  type GenerateArticlePromotionResult,
  type GenerateArticleSectionResult,
  type GenerateArticleSeoResult,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import type { AiPromptEntry, Article, ArticleSection, ArticleStatus, PromotionTweet } from '../types/database'

type AiPreview =
  | { kind: 'outline'; payload: GenerateArticleOutlineResult }
  | { kind: 'section'; payload: GenerateArticleSectionResult; sectionId: string }
  | { kind: 'hook'; payload: GenerateArticleHookResult }
  | { kind: 'improve'; payload: GenerateArticleSectionResult; sectionId: string }
  | { kind: 'seo'; payload: GenerateArticleSeoResult }
  | { kind: 'promotion'; payload: GenerateArticlePromotionResult }
  | null

interface EditorState {
  title: string
  subtitle: string
  content: string
  pillar_id: string
  status: ArticleStatus
  x_article_url: string
  seo_keywords: string[]
  meta_description: string
  notes: string
  outline: ArticleSection[]
  ai_generated: boolean
  ai_prompts: AiPromptEntry[]
}

const STATUSES: ArticleStatus[] = ['draft', 'published', 'archived']

function buildEditorState(article: Article): EditorState {
  return {
    title: article.title,
    subtitle: article.subtitle ?? '',
    content: article.content,
    pillar_id: article.pillar_id ?? '',
    status: article.status,
    x_article_url: article.x_article_url ?? '',
    seo_keywords: article.seo_keywords ?? [],
    meta_description: article.meta_description ?? '',
    notes: article.notes ?? '',
    outline: article.outline,
    ai_generated: article.ai_generated,
    ai_prompts: article.ai_prompts,
  }
}

function buildArticleMarkdown(draft: EditorState) {
  const sections = draft.outline
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((section) => `## ${section.title || 'Untitled section'}\n\n${section.content}`.trim())
    .join('\n\n')

  return [`# ${draft.title || 'Untitled article'}`, draft.subtitle ? `*${draft.subtitle}*` : '', draft.content, sections]
    .filter(Boolean)
    .join('\n\n')
}

function countWords(value: string) {
  const matches = value.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

function countCharacters(value: string) {
  return value.length
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return 'Not saved yet'
  }

  return `Saved ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function buildPromptEntry(prompt: string, response: string, sectionId?: string): AiPromptEntry {
  return {
    section_id: sectionId,
    prompt,
    response,
    timestamp: new Date().toISOString(),
  }
}

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { articles, analytics, pillars, loading, error, updateArticle, deleteArticle, refetch } = useArticles()

  const article = articles.find((entry) => entry.id === id)
  const analyticsEntry = analytics.find((entry) => entry.article_id === id)

  const [draft, setDraft] = useState<EditorState | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [aiPreview, setAiPreview] = useState<AiPreview>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [initializedArticleId, setInitializedArticleId] = useState<string | null>(null)
  const [improveInstruction, setImproveInstruction] = useState('Make this section sharper, clearer, and more opinionated.')

  const autosaveTimerRef = useRef<number | null>(null)
  const selectedPillar = pillars.find((pillar) => pillar.id === (draft?.pillar_id ?? article?.pillar_id ?? ''))

  useEffect(() => {
    if (!article) {
      return
    }

    if (initializedArticleId !== article.id || (!isDirty && draft === null)) {
      const nextDraft = buildEditorState(article)
      setDraft(nextDraft)
      setInitializedArticleId(article.id)
      setLastSavedAt(article.updated_at)
      setSelectedSectionId(nextDraft.outline[0]?.id ?? null)
      setAiPreview(null)
      setAiError(null)
      setSaveError(null)
      setIsDirty(false)
    }
  }, [article, draft, initializedArticleId, isDirty])

  useEffect(() => {
    if (!draft || !isDirty) {
      return
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraft('auto')
    }, 3000)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [draft, isDirty])

  const updateDraft = (updater: (current: EditorState) => EditorState) => {
    setDraft((current) => {
      if (!current) {
        return current
      }

      return updater(current)
    })
    setIsDirty(true)
    setSaveError(null)
  }

  const saveDraft = async (mode: 'manual' | 'auto' | 'blur') => {
    if (!draft || !article || isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const markdown = buildArticleMarkdown(draft)
      const wordCount = countWords(markdown)
      const now = new Date().toISOString()

      await updateArticle(article.id, {
        title: draft.title.trim() || 'Untitled article',
        subtitle: draft.subtitle.trim() || null,
        content: draft.content,
        pillar_id: draft.pillar_id || null,
        status: draft.status,
        published_at: draft.status === 'published' ? article.published_at ?? now : null,
        x_article_url: draft.status === 'published' && draft.x_article_url.trim() ? draft.x_article_url.trim() : null,
        seo_keywords: draft.seo_keywords.length ? draft.seo_keywords : [],
        meta_description: draft.meta_description.trim() || null,
        notes: draft.notes.trim() || null,
        outline: draft.outline.map((section, index) => ({ ...section, order: index })),
        ai_generated: draft.ai_generated,
        ai_prompts: draft.ai_prompts,
        word_count: wordCount,
      })

      setLastSavedAt(now)
      setIsDirty(false)
      if (mode === 'manual') {
        setAiError(null)
      }
    } catch (savingError) {
      setSaveError(savingError instanceof Error ? savingError.message : 'Unable to save article.')
    } finally {
      setIsSaving(false)
    }
  }

  const activeSection = draft?.outline.find((section) => section.id === selectedSectionId) ?? draft?.outline[0] ?? null
  const markdown = draft ? buildArticleMarkdown(draft) : ''
  const wordCount = countWords(markdown)
  const characterCount = countCharacters(markdown)

  const runAiAction = async (action: () => Promise<AiPreview>) => {
    setIsAiLoading(true)
    setAiError(null)

    try {
      const preview = await action()
      setAiPreview(preview)
    } catch (generationError) {
      setAiError(generationError instanceof Error ? generationError.message : 'Unable to generate article content.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const applyAiPreview = async () => {
    if (!draft || !aiPreview) {
      return
    }

    if (aiPreview.kind === 'outline') {
      const nextOutline = aiPreview.payload.sections.map((section, index) => ({
        id: crypto.randomUUID(),
        title: section.title,
        content: '',
        order: index,
      }))

      updateDraft((current) => ({
        ...current,
        ai_generated: true,
        ai_prompts: [
          buildPromptEntry(
            `Outline for ${current.title}`,
            JSON.stringify(aiPreview.payload.sections),
          ),
          ...current.ai_prompts,
        ],
        outline: nextOutline,
      }))
      setSelectedSectionId(nextOutline[0]?.id ?? null)
      return
    }

    if (aiPreview.kind === 'section' || aiPreview.kind === 'improve') {
      updateDraft((current) => ({
        ...current,
        ai_generated: true,
        ai_prompts: [
          buildPromptEntry(
            aiPreview.kind === 'section' ? `Generate section ${aiPreview.sectionId}` : improveInstruction,
            aiPreview.payload.content,
            aiPreview.sectionId,
          ),
          ...current.ai_prompts,
        ],
        outline: current.outline.map((section) =>
          section.id === aiPreview.sectionId ? { ...section, content: aiPreview.payload.content } : section,
        ),
      }))
      return
    }

    if (aiPreview.kind === 'hook') {
      updateDraft((current) => ({
        ...current,
        ai_generated: true,
        ai_prompts: [buildPromptEntry(`Hook for ${current.title}`, aiPreview.payload.hooks.join('\n\n')), ...current.ai_prompts],
        content: [aiPreview.payload.hooks[0] ?? '', current.content].filter(Boolean).join('\n\n'),
      }))
      return
    }

    if (aiPreview.kind === 'seo') {
      updateDraft((current) => ({
        ...current,
        ai_generated: true,
        ai_prompts: [
          buildPromptEntry(`SEO for ${current.title}`, JSON.stringify(aiPreview.payload)),
          ...current.ai_prompts,
        ],
        seo_keywords: aiPreview.payload.keywords,
        meta_description: aiPreview.payload.meta_description,
      }))
      return
    }

    if (aiPreview.kind === 'promotion') {
      const now = new Date().toISOString()
      const tweets: PromotionTweet[] = aiPreview.payload.tweets.map((tweet) => ({ content: tweet, created_at: now }))

      const { error: analyticsError } = await supabase.from('article_analytics').upsert(
        {
          article_id: article?.id,
          promotion_tweets: tweets,
          updated_at: now,
        },
        { onConflict: 'article_id' },
      )

      if (analyticsError) {
        throw new Error(analyticsError.message || 'Unable to save promotion tweets.')
      }

      await refetch()
      await saveDraft('manual')
    }
  }

  if (!loading && !article) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Articles</p>
        <h2 className="mt-3 font-serif text-3xl text-white">Article not found</h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">{error || 'Open the article list and create a fresh draft.'}</p>
        <Link
          to="/articles"
          className="mt-6 inline-flex items-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950"
        >
          Back to Articles
        </Link>
      </section>
    )
  }

  if (loading || !draft) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/80">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-300" />
      </div>
    )
  }

  const currentArticle = article as Article

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Article editor</p>
              <p className="mt-3 text-sm text-slate-400">{formatDate(currentArticle.created_at)}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              {isSaving ? 'Saving...' : formatSavedAt(lastSavedAt)}
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <input
              value={draft.title}
              onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))}
              onBlur={() => void saveDraft('blur')}
              placeholder="Article title"
              className="w-full border-0 bg-transparent font-serif text-5xl text-white outline-none placeholder:text-slate-500"
            />
            <input
              value={draft.subtitle}
              onChange={(event) => updateDraft((current) => ({ ...current, subtitle: event.target.value }))}
              onBlur={() => void saveDraft('blur')}
              placeholder="Subtitle"
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-lg text-slate-200 outline-none transition focus:border-cyan-300/40"
            />
            <textarea
              value={draft.content}
              onChange={(event) => updateDraft((current) => ({ ...current, content: event.target.value }))}
              onBlur={() => void saveDraft('blur')}
              placeholder="Write the article intro or freeform markdown here."
              rows={10}
              className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-slate-200 outline-none transition focus:border-cyan-300/40"
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sections</p>
              <p className="mt-2 text-sm text-slate-500">Add structure, then generate or refine section copy.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const sectionId = crypto.randomUUID()
                updateDraft((current) => ({
                  ...current,
                  outline: [
                    ...current.outline,
                    { id: sectionId, title: 'New section', content: '', order: current.outline.length },
                  ],
                }))
                setSelectedSectionId(sectionId)
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Add Section
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {draft.outline.map((section, index) => {
              const isActive = section.id === (activeSection?.id ?? '')

              return (
                <article
                  key={section.id}
                  className={`rounded-[1.75rem] border p-5 transition ${
                    isActive ? 'border-cyan-300/30 bg-cyan-400/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionId(section.id)}
                      className="text-left"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Section {index + 1}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((current) => {
                            const next = [...current.outline]
                            if (index === 0) {
                              return current
                            }

                            ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                            return {
                              ...current,
                              outline: next.map((entry, position) => ({ ...entry, order: position })),
                            }
                          })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((current) => {
                            const next = [...current.outline]
                            if (index === current.outline.length - 1) {
                              return current
                            }

                            ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                            return {
                              ...current,
                              outline: next.map((entry, position) => ({ ...entry, order: position })),
                            }
                          })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((current) => ({
                            ...current,
                            outline: current.outline
                              .filter((entry) => entry.id !== section.id)
                              .map((entry, position) => ({ ...entry, order: position })),
                          }))
                        }
                        className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-2 text-rose-200 transition hover:bg-rose-400/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={section.title}
                    onFocus={() => setSelectedSectionId(section.id)}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        outline: current.outline.map((entry) =>
                          entry.id === section.id ? { ...entry, title: event.target.value } : entry,
                        ),
                      }))
                    }
                    onBlur={() => void saveDraft('blur')}
                    placeholder="Section title"
                    className="mt-4 w-full rounded-[1.25rem] border border-white/10 bg-slate-950/50 px-4 py-3 text-lg text-white outline-none transition focus:border-cyan-300/40"
                  />
                  <textarea
                    value={section.content}
                    onFocus={() => setSelectedSectionId(section.id)}
                    onChange={(event) =>
                      updateDraft((current) => ({
                        ...current,
                        outline: current.outline.map((entry) =>
                          entry.id === section.id ? { ...entry, content: event.target.value } : entry,
                        ),
                      }))
                    }
                    onBlur={() => void saveDraft('blur')}
                    rows={8}
                    placeholder="Write or generate section content."
                    className="mt-4 w-full rounded-[1.5rem] border border-white/10 bg-slate-950/50 px-4 py-4 text-sm leading-7 text-slate-200 outline-none transition focus:border-cyan-300/40"
                  />
                </article>
              )
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Words</p>
              <p className="mt-3 font-serif text-3xl text-white">{wordCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Characters</p>
              <p className="mt-3 font-serif text-3xl text-white">{characterCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected pillar</p>
              <p className="mt-3 text-sm text-slate-200">{selectedPillar?.name ?? 'None selected'}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">AI assistant</p>
                <h3 className="mt-1 font-serif text-2xl text-white">Build the article faster</h3>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Pillar</span>
                <select
                  value={draft.pillar_id}
                  onChange={(event) => updateDraft((current) => ({ ...current, pillar_id: event.target.value }))}
                  onBlur={() => void saveDraft('blur')}
                  className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                >
                  <option value="">Select pillar</option>
                  {pillars.map((pillar) => (
                    <option key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      const pillarName = pillars.find((pillar) => pillar.id === draft.pillar_id)?.name
                      if (!pillarName || !draft.title.trim()) {
                        throw new Error('Add a title and choose a pillar before generating an outline.')
                      }

                      const payload = await generateArticle<GenerateArticleOutlineResult>({
                        mode: 'outline',
                        title: draft.title.trim(),
                        pillar: pillarName,
                        topic: draft.subtitle.trim() || draft.notes.trim() || undefined,
                      })

                      return { kind: 'outline', payload }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Outline
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      const pillarName = pillars.find((pillar) => pillar.id === draft.pillar_id)?.name
                      if (!pillarName || !activeSection?.title.trim()) {
                        throw new Error('Select a titled section before generating content.')
                      }

                      const payload = await generateArticle<GenerateArticleSectionResult>({
                        mode: 'section',
                        title: draft.title.trim(),
                        pillar: pillarName,
                        section_title: activeSection.title.trim(),
                        section_context: [draft.subtitle, draft.content, activeSection.content].filter(Boolean).join('\n\n') || undefined,
                        tone: 'clear, strategic, direct',
                      })

                      return { kind: 'section', payload, sectionId: activeSection.id }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate Content
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      const pillarName = pillars.find((pillar) => pillar.id === draft.pillar_id)?.name
                      if (!pillarName || !draft.title.trim()) {
                        throw new Error('Add a title and choose a pillar before generating hooks.')
                      }

                      const payload = await generateArticle<GenerateArticleHookResult>({
                        mode: 'hook',
                        title: draft.title.trim(),
                        pillar: pillarName,
                        topic: draft.subtitle.trim() || draft.notes.trim() || undefined,
                      })

                      return { kind: 'hook', payload }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" />
                  Generate Hook
                </button>

                <label className="block rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Improve instruction</span>
                  <textarea
                    value={improveInstruction}
                    onChange={(event) => setImproveInstruction(event.target.value)}
                    rows={3}
                    className="w-full bg-transparent text-sm leading-6 text-slate-200 outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      if (!activeSection?.content.trim()) {
                        throw new Error('Choose a section with content before improving it.')
                      }

                      const payload = await generateArticle<GenerateArticleSectionResult>({
                        mode: 'improve',
                        content: activeSection.content,
                        instruction: improveInstruction.trim() || 'Improve this section.',
                      })

                      return { kind: 'improve', payload, sectionId: activeSection.id }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <Wand2 className="h-4 w-4" />
                  Improve Section
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      if (!draft.title.trim()) {
                        throw new Error('Add a title before generating SEO.')
                      }

                      const payload = await generateArticle<GenerateArticleSeoResult>({
                        mode: 'seo',
                        title: draft.title.trim(),
                        content_summary: [draft.subtitle, draft.content, ...draft.outline.map((section) => section.title)]
                          .filter(Boolean)
                          .join(' | '),
                      })

                      return { kind: 'seo', payload }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate SEO
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void runAiAction(async () => {
                      if (!draft.title.trim()) {
                        throw new Error('Add a title before generating promotion tweets.')
                      }

                      const payload = await generateArticle<GenerateArticlePromotionResult>({
                        mode: 'promotion',
                        title: draft.title.trim(),
                        summary: [draft.subtitle, draft.content].filter(Boolean).join('\n\n'),
                        key_points: draft.outline.map((section) => section.title).filter(Boolean),
                      })

                      return { kind: 'promotion', payload }
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Promotion Tweets
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">AI output</p>
                <h3 className="mt-2 font-serif text-2xl text-white">Preview and apply</h3>
              </div>
              {isAiLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" /> : null}
            </div>

            {aiError || saveError ? (
              <div className="mt-4 rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {aiError || saveError}
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              {aiPreview?.kind === 'outline' ? (
                <div className="space-y-3">
                  {aiPreview.payload.sections.map((section, index) => (
                    <div key={`${section.title}-${index}`} className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-3">
                      <p className="text-sm font-medium text-white">{section.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{section.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {aiPreview?.kind === 'section' || aiPreview?.kind === 'improve' ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {aiPreview.kind === 'section' ? 'Generated section' : 'Improved section'}
                  </p>
                  <div className="max-h-[280px] overflow-y-auto text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                    {aiPreview.payload.content}
                  </div>
                </div>
              ) : null}

              {aiPreview?.kind === 'hook' ? (
                <div className="space-y-3">
                  {aiPreview.payload.hooks.map((hook, index) => (
                    <div key={`${hook.slice(0, 20)}-${index}`} className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-200">
                      {hook}
                    </div>
                  ))}
                </div>
              ) : null}

              {aiPreview?.kind === 'seo' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Keywords</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {aiPreview.payload.keywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Meta description</p>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{aiPreview.payload.meta_description}</p>
                  </div>
                </div>
              ) : null}

              {aiPreview?.kind === 'promotion' ? (
                <div className="space-y-3">
                  {aiPreview.payload.tweets.map((tweet, index) => (
                    <div key={`${tweet.slice(0, 20)}-${index}`} className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-200">
                      {tweet}
                    </div>
                  ))}
                </div>
              ) : null}

              {!aiPreview && !isAiLoading ? (
                <p className="text-sm leading-7 text-slate-400">
                  Generate an outline, section, SEO pack, or promotion tweets and apply the result into the article.
                </p>
              ) : null}
            </div>

            {aiPreview ? (
              <button
                type="button"
                onClick={() => void applyAiPreview()}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                <Sparkles className="h-4 w-4" />
                Apply
              </button>
            ) : null}

            {analyticsEntry?.promotion_tweets.length ? (
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Saved promotion tweets</p>
                <div className="mt-3 space-y-3">
                  {analyticsEntry.promotion_tweets.map((tweet, index) => (
                    <div key={`${tweet.content.slice(0, 20)}-${index}`} className="rounded-[1.25rem] border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-200">
                      {tweet.content}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <section className="sticky bottom-4 mt-6 rounded-[2rem] border border-white/10 bg-surface-950/90 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)] lg:flex lg:items-center">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select
                value={draft.status}
                onChange={(event) => updateDraft((current) => ({ ...current, status: event.target.value as ArticleStatus }))}
                onBlur={() => void saveDraft('blur')}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            {draft.status === 'published' ? (
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">X Article URL</span>
                <input
                  value={draft.x_article_url}
                  onChange={(event) => updateDraft((current) => ({ ...current, x_article_url: event.target.value }))}
                  onBlur={() => void saveDraft('blur')}
                  placeholder="https://x.com/i/article/..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-cyan-300/40"
                />
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => void saveDraft('manual')}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 transition hover:bg-rose-400/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </section>

      <PreviewModal isOpen={isPreviewOpen} title={draft.title || 'Untitled article'} onClose={() => setIsPreviewOpen(false)}>
        <MarkdownPreview content={markdown} className="space-y-5" />
      </PreviewModal>

      <DeleteConfirm
        isOpen={isDeleteOpen}
        title="Delete article?"
        description="This removes the article draft and its analytics row."
        confirmLabel="Delete article"
        loading={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() =>
          void (async () => {
            setIsDeleting(true)

            try {
              await deleteArticle(currentArticle.id)
              navigate('/articles')
            } finally {
              setIsDeleting(false)
            }
          })()
        }
      />
    </>
  )
}
