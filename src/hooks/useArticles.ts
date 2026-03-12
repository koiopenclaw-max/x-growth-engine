import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { AiPromptEntry, Article, ArticleAnalytics, ArticleSection, ContentPillar, PromotionTweet } from '../types/database'

function sanitizePayload<T extends object>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>
}

function asArticleSectionArray(value: unknown): ArticleSection[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const record = item as Record<string, unknown>

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : crypto.randomUUID(),
        title: typeof record.title === 'string' ? record.title : '',
        content: typeof record.content === 'string' ? record.content : '',
        order: typeof record.order === 'number' ? record.order : index,
      }
    })
    .filter((item): item is ArticleSection => Boolean(item))
    .sort((left, right) => left.order - right.order)
}

function asAiPromptEntryArray(value: unknown): AiPromptEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const entries: AiPromptEntry[] = []

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const record = item as Record<string, unknown>

    if (typeof record.prompt !== 'string' || typeof record.response !== 'string' || typeof record.timestamp !== 'string') {
      return
    }

    entries.push({
      section_id: typeof record.section_id === 'string' ? record.section_id : undefined,
      prompt: record.prompt,
      response: record.response,
      timestamp: record.timestamp,
    })
  })

  return entries
}

function asPromotionTweetArray(value: unknown): PromotionTweet[] {
  if (!Array.isArray(value)) {
    return []
  }

  const tweets: PromotionTweet[] = []

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const record = item as Record<string, unknown>

    if (typeof record.content !== 'string' || typeof record.created_at !== 'string') {
      return
    }

    tweets.push({
      content: record.content,
      created_at: record.created_at,
      posted_url: typeof record.posted_url === 'string' ? record.posted_url : undefined,
    })
  })

  return tweets
}

function normalizeArticle(row: Record<string, unknown>): Article {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    cover_image_url: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    content: typeof row.content === 'string' ? row.content : '',
    pillar_id: typeof row.pillar_id === 'string' ? row.pillar_id : null,
    status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
    published_at: typeof row.published_at === 'string' ? row.published_at : null,
    x_article_url: typeof row.x_article_url === 'string' ? row.x_article_url : null,
    seo_keywords: Array.isArray(row.seo_keywords) ? row.seo_keywords.filter((item): item is string => typeof item === 'string') : null,
    meta_description: typeof row.meta_description === 'string' ? row.meta_description : null,
    outline: asArticleSectionArray(row.outline),
    ai_generated: Boolean(row.ai_generated),
    ai_prompts: asAiPromptEntryArray(row.ai_prompts),
    word_count: typeof row.word_count === 'number' ? row.word_count : 0,
    notes: typeof row.notes === 'string' ? row.notes : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

function normalizeArticleAnalytics(row: Record<string, unknown>): ArticleAnalytics {
  return {
    id: String(row.id),
    article_id: String(row.article_id),
    reads: typeof row.reads === 'number' ? row.reads : 0,
    impressions: typeof row.impressions === 'number' ? row.impressions : 0,
    likes: typeof row.likes === 'number' ? row.likes : 0,
    shares: typeof row.shares === 'number' ? row.shares : 0,
    bookmarks: typeof row.bookmarks === 'number' ? row.bookmarks : 0,
    avg_read_time_seconds: typeof row.avg_read_time_seconds === 'number' ? row.avg_read_time_seconds : 0,
    new_followers: typeof row.new_followers === 'number' ? row.new_followers : 0,
    promotion_tweets: asPromotionTweetArray(row.promotion_tweets),
    recorded_at: typeof row.recorded_at === 'string' ? row.recorded_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [analytics, setAnalytics] = useState<ArticleAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        { data: articleRows, error: articleError },
        { data: pillarRows, error: pillarError },
        { data: analyticsRows, error: analyticsError },
      ] = await Promise.all([
        supabase.from('articles').select('*').order('updated_at', { ascending: false }),
        supabase.from('content_pillars').select('*').order('name', { ascending: true }),
        supabase.from('article_analytics').select('*').order('updated_at', { ascending: false }),
      ])

      if (articleError) {
        throw articleError
      }

      if (pillarError) {
        throw pillarError
      }

      if (analyticsError) {
        throw analyticsError
      }

      setArticles((articleRows ?? []).map((row) => normalizeArticle(row as Record<string, unknown>)))
      setPillars((pillarRows ?? []) as ContentPillar[])
      setAnalytics((analyticsRows ?? []).map((row) => normalizeArticleAnalytics(row as Record<string, unknown>)))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load articles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const createArticle = useCallback(
    async (article: Partial<Article>) => {
      setError(null)

      const payload = sanitizePayload({
        title: article.title?.trim() || 'Untitled article',
        subtitle: article.subtitle ?? null,
        cover_image_url: article.cover_image_url ?? null,
        content: article.content ?? '',
        pillar_id: article.pillar_id ?? null,
        status: article.status ?? 'draft',
        published_at: article.published_at ?? null,
        x_article_url: article.x_article_url ?? null,
        seo_keywords: article.seo_keywords ?? [],
        meta_description: article.meta_description ?? null,
        outline: article.outline ?? [],
        ai_generated: article.ai_generated ?? false,
        ai_prompts: article.ai_prompts ?? [],
        word_count: article.word_count ?? 0,
        notes: article.notes ?? null,
        updated_at: new Date().toISOString(),
      })

      const { data, error: insertError } = await supabase.from('articles').insert(payload).select('*').single()

      if (insertError || !data) {
        const message = insertError?.message || 'Unable to create article.'
        setError(message)
        throw new Error(message)
      }

      const normalized = normalizeArticle(data as Record<string, unknown>)
      setArticles((current) => [normalized, ...current])

      const { data: analyticsRow } = await supabase
        .from('article_analytics')
        .upsert({ article_id: normalized.id, updated_at: new Date().toISOString() }, { onConflict: 'article_id' })
        .select('*')
        .single()

      if (analyticsRow) {
        setAnalytics((current) => {
          const next = current.filter((entry) => entry.article_id !== normalized.id)
          return [normalizeArticleAnalytics(analyticsRow as Record<string, unknown>), ...next]
        })
      }

      return normalized
    },
    [],
  )

  const updateArticle = useCallback(async (id: string, updates: Partial<Article>) => {
    setError(null)

    const payload = sanitizePayload({
      ...updates,
      updated_at: new Date().toISOString(),
    })

    const { data, error: updateError } = await supabase.from('articles').update(payload).eq('id', id).select('*').single()

    if (updateError || !data) {
      const message = updateError?.message || 'Unable to update article.'
      setError(message)
      throw new Error(message)
    }

    const normalized = normalizeArticle(data as Record<string, unknown>)
    setArticles((current) => current.map((article) => (article.id === id ? normalized : article)))
  }, [])

  const deleteArticle = useCallback(async (id: string) => {
    setError(null)

    const { error: deleteError } = await supabase.from('articles').delete().eq('id', id)

    if (deleteError) {
      const message = deleteError.message || 'Unable to delete article.'
      setError(message)
      throw new Error(message)
    }

    setArticles((current) => current.filter((article) => article.id !== id))
    setAnalytics((current) => current.filter((entry) => entry.article_id !== id))
  }, [])

  return {
    articles,
    pillars,
    analytics,
    loading,
    error,
    createArticle,
    updateArticle,
    deleteArticle,
    refetch,
  }
}
