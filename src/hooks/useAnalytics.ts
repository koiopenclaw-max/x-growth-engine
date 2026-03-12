import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '../lib/supabase'
import type { AccountSnapshot, EngagementLog, PostAnalytics } from '../types/database'

function sanitizePayload<T extends object>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>
}

export function useAnalytics() {
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [postAnalyticsRows, setPostAnalyticsRows] = useState<PostAnalytics[]>([])
  const [engagementLog, setEngagementLog] = useState<EngagementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        { data: snapshotRows, error: snapshotsError },
        { data: analyticsRows, error: analyticsError },
        { data: engagementRows, error: engagementError },
      ] = await Promise.all([
        supabase.from('account_snapshots').select('*').order('date', { ascending: false }),
        supabase.from('post_analytics').select('*').order('engagement_rate', { ascending: false, nullsFirst: false }),
        supabase.from('engagement_log').select('*').order('created_at', { ascending: false }),
      ])

      if (snapshotsError) {
        throw snapshotsError
      }

      if (analyticsError) {
        throw analyticsError
      }

      if (engagementError) {
        throw engagementError
      }

      setSnapshots((snapshotRows ?? []) as AccountSnapshot[])
      setPostAnalyticsRows((analyticsRows ?? []) as PostAnalytics[])
      setEngagementLog((engagementRows ?? []) as EngagementLog[])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const addSnapshot = useCallback(
    async (snapshot: Partial<AccountSnapshot>) => {
      setError(null)

      const { error: insertError } = await supabase.from('account_snapshots').insert(sanitizePayload(snapshot))

      if (insertError) {
        const message = insertError.message || 'Unable to save account snapshot.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  const upsertPostAnalytics = useCallback(
    async (postId: string, analytics: Partial<PostAnalytics>) => {
      setError(null)

      const payload = sanitizePayload({
        ...analytics,
        post_id: postId,
      })

      const { error: upsertError } = await supabase
        .from('post_analytics')
        .upsert(payload, { onConflict: 'post_id' })

      if (upsertError) {
        const message = upsertError.message || 'Unable to save post analytics.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  const addEngagement = useCallback(
    async (entry: Partial<EngagementLog>) => {
      setError(null)

      const { error: insertError } = await supabase.from('engagement_log').insert(sanitizePayload(entry))

      if (insertError) {
        const message = insertError.message || 'Unable to save engagement activity.'
        setError(message)
        throw new Error(message)
      }

      await refetch()
    },
    [refetch],
  )

  const postAnalytics = useMemo(() => {
    return new Map(postAnalyticsRows.map((row) => [row.post_id, row]))
  }, [postAnalyticsRows])

  return {
    snapshots,
    postAnalytics,
    engagementLog,
    loading,
    error,
    addSnapshot,
    upsertPostAnalytics,
    addEngagement,
    refetch,
  }
}
