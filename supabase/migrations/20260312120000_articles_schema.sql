-- X Growth Engine: Articles Schema
-- Tables: articles, article_analytics

-- ============================================================
-- ENUM
-- ============================================================

CREATE TYPE article_status_enum AS ENUM ('draft', 'published', 'archived');

-- ============================================================
-- TABLE: articles
-- ============================================================

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_image_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  status article_status_enum NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  x_article_url TEXT,
  seo_keywords TEXT[],
  meta_description TEXT,
  outline JSONB DEFAULT '[]'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompts JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: article_analytics
-- ============================================================

CREATE TABLE article_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
  reads INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,
  avg_read_time_seconds INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  promotion_tweets JSONB DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER article_analytics_updated_at
  BEFORE UPDATE ON article_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_pillar_id ON articles(pillar_id);
CREATE INDEX idx_articles_published_at ON articles(published_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON articles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access" ON article_analytics
  FOR ALL USING (auth.role() = 'authenticated');
