export type PostType = 'tweet' | 'thread' | 'reply' | 'quote' | 'poll'
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'archived'
export type EngagementType = 'reply' | 'quote' | 'like' | 'retweet' | 'follow' | 'dm'

export interface ContentPillar {
  id: string
  name: string
  description: string | null
  color: string | null
  target_percentage: number | null
  created_at: string | null
}

export interface Post {
  id: string
  pillar_id: string | null
  content: string
  post_type: PostType
  status: PostStatus
  scheduled_for: string | null
  posted_at: string | null
  x_post_url: string | null
  ai_generated: boolean | null
  ai_prompt: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PostAnalytics {
  id: string
  post_id: string
  impressions: number | null
  likes: number | null
  retweets: number | null
  replies: number | null
  bookmarks: number | null
  profile_clicks: number | null
  link_clicks: number | null
  engagement_rate: number | null
  recorded_at: string | null
  updated_at: string | null
}

export interface AccountSnapshot {
  id: string
  date: string
  followers: number
  following: number
  total_posts: number | null
  impressions_today: number | null
  profile_visits: number | null
  notes: string | null
  created_at: string | null
}

export interface EngagementLog {
  id: string
  action_type: EngagementType
  target_account: string | null
  target_post_url: string | null
  notes: string | null
  created_at: string | null
}
