import { useCallback, useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { ContentPillar, Post } from '../types/database'

function sanitizePayload<T extends object>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [{ data: postRows, error: postsError }, { data: pillarRows, error: pillarsError }] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .order('scheduled_for', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase.from('content_pillars').select('*').order('name', { ascending: true }),
      ])

      if (postsError) {
        throw postsError
      }

      if (pillarsError) {
        throw pillarsError
      }

      setPosts((postRows ?? []) as Post[])
      setPillars((pillarRows ?? []) as ContentPillar[])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const createPost = useCallback(
    async (post: Partial<Post>) => {
      setError(null)

      const { error: insertError } = await supabase.from('posts').insert(sanitizePayload(post))

      if (insertError) {
        const message = insertError.message || 'Unable to create post.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  const updatePost = useCallback(
    async (id: string, updates: Partial<Post>) => {
      setError(null)

      const { error: updateError } = await supabase.from('posts').update(sanitizePayload(updates)).eq('id', id)

      if (updateError) {
        const message = updateError.message || 'Unable to update post.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  const deletePost = useCallback(
    async (id: string) => {
      setError(null)

      const { error: deleteError } = await supabase.from('posts').delete().eq('id', id)

      if (deleteError) {
        const message = deleteError.message || 'Unable to delete post.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  return {
    posts,
    pillars,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    refetch,
  }
}
