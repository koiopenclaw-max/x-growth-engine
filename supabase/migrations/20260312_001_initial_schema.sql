-- X Growth Engine: Initial Schema
-- Tables: content_pillars, posts, post_analytics, account_snapshots, engagement_log

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE post_type_enum AS ENUM ('tweet', 'thread', 'reply', 'quote', 'poll');
CREATE TYPE post_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'archived');
CREATE TYPE engagement_type_enum AS ENUM ('reply', 'quote', 'like', 'retweet', 'follow', 'dm');

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: content_pillars
-- ============================================================

CREATE TABLE content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  target_percentage INTEGER CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: posts
-- ============================================================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  post_type post_type_enum NOT NULL,
  status post_status_enum NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  x_post_url TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: post_analytics
-- ============================================================

CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,
  profile_clicks INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER post_analytics_updated_at
  BEFORE UPDATE ON post_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: account_snapshots
-- ============================================================

CREATE TABLE account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  followers INTEGER NOT NULL,
  following INTEGER NOT NULL,
  total_posts INTEGER,
  impressions_today INTEGER,
  profile_visits INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: engagement_log
-- ============================================================

CREATE TABLE engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type engagement_type_enum NOT NULL,
  target_account TEXT,
  target_post_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX idx_posts_pillar_id ON posts(pillar_id);
CREATE INDEX idx_account_snapshots_date ON account_snapshots(date);
CREATE INDEX idx_engagement_log_created_at ON engagement_log(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_log ENABLE ROW LEVEL SECURITY;

-- Phase 1: Single user - allow all for authenticated
CREATE POLICY "Authenticated users full access" ON content_pillars
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON posts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON post_analytics
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON account_snapshots
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON engagement_log
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA: Content Pillars
-- ============================================================

INSERT INTO content_pillars (name, description, color, target_percentage) VALUES
  ('AI & Vibecoding', 'AI tools, vibecoding techniques, Claude/GPT tips, coding with AI', '#8B5CF6', 40),
  ('OpenClaw', 'OpenClaw platform, features, use cases, tutorials', '#06B6D4', 25),
  ('Crypto & AI', 'Intersection of crypto and AI, DeFi, AI tokens, market analysis', '#F59E0B', 20),
  ('Engagement & Community', 'Community building, replies, discussions, memes, personal takes', '#10B981', 15);
