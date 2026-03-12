# Tasks 7-9: Article Creator Feature

## Objective
Add a complete Article Creator feature to the X Growth Engine app — article editor, AI generation, analytics, and navigation updates.

## Context
X Growth Engine is a content platform for growing an X account. It already has: posts calendar, AI tweet generator, analytics dashboard. Now we're adding X Articles (long-form content up to 25,000 chars). The database already has `articles` and `article_analytics` tables.

## Existing Database Schema (already created, do NOT modify)

```sql
-- articles table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_image_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  status article_status_enum NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
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

-- article_analytics table
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
```

## Existing Types (in src/types/database.ts — ADD new types, don't remove existing)

Add these types:
```typescript
export type ArticleStatus = 'draft' | 'published' | 'archived'

export interface Article {
  id: string
  title: string
  subtitle: string | null
  cover_image_url: string | null
  content: string
  pillar_id: string | null
  status: ArticleStatus
  published_at: string | null
  x_article_url: string | null
  seo_keywords: string[] | null
  meta_description: string | null
  outline: ArticleSection[]
  ai_generated: boolean
  ai_prompts: AiPromptEntry[]
  word_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ArticleSection {
  id: string
  title: string
  content: string
  order: number
}

export interface AiPromptEntry {
  section_id?: string
  prompt: string
  response: string
  timestamp: string
}

export interface ArticleAnalytics {
  id: string
  article_id: string
  reads: number
  impressions: number
  likes: number
  shares: number
  bookmarks: number
  avg_read_time_seconds: number
  new_followers: number
  promotion_tweets: PromotionTweet[]
  recorded_at: string
  updated_at: string
}

export interface PromotionTweet {
  content: string
  posted_url?: string
  created_at: string
}
```

## Requirements

### 1. Article List Page (`src/pages/Articles.tsx`) — NEW
- Header: "Articles" title + "New Article" button
- List of articles as cards showing: title, subtitle, pillar badge, status badge, word count, created date
- Filter by status (All, Draft, Published, Archived)
- Filter by pillar
- Empty state when no articles
- Click on article → navigate to editor

### 2. Article Editor Page (`src/pages/ArticleEditor.tsx`) — NEW
Full article creation/editing page with:

**Left Panel (Editor - 60% width):**
- Title input (large, serif font)
- Subtitle input
- Content textarea with markdown support (user writes markdown, rendered on preview)
- Section management: Add Section, Reorder, Delete
- Each section has: title input + content textarea
- Character count / word count at bottom
- Auto-save indicator (save on blur/after 3 seconds idle)

**Right Panel (AI Assistant - 40% width):**
- Pillar selector
- "Generate Outline" button → sends title + pillar to AI → returns outline sections
- Per-section "Generate Content" button → AI fills that section
- "Generate Hook" → 3 alternative opening paragraphs
- "Improve Section" → rewrites selected section
- "Generate SEO" → suggests keywords + meta description
- "Generate Promotion Tweets" → 3-5 tweets to promote this article
- AI output appears in a preview area, "Apply" button copies to editor

**Bottom Bar:**
- Status: Draft / Published / Archived (dropdown)
- X Article URL (shown when published)
- Save button
- Preview button (opens modal with rendered markdown)
- Delete button (with confirmation)

### 3. Edge Function (`supabase/functions/generate-article/index.ts`) — NEW
Handles AI generation for articles. Modes:

**mode: "outline"**
- Input: title, pillar, topic
- Output: { sections: [{ title, description }] } (5-7 sections)

**mode: "section"**
- Input: title, pillar, section_title, section_context, tone
- Output: { content: string } (500-1500 words for that section)

**mode: "hook"**
- Input: title, pillar, topic
- Output: { hooks: string[] } (3 alternatives)

**mode: "improve"**
- Input: content, instruction
- Output: { content: string } (improved version)

**mode: "seo"**
- Input: title, content_summary
- Output: { keywords: string[], meta_description: string }

**mode: "promotion"**
- Input: title, summary, key_points
- Output: { tweets: string[] } (3-5 promotion tweets)

System prompt should know the account is @KoiNov1, niche is AI/Vibecoding/OpenClaw/Crypto, audience is global English.

### 4. Data Hook (`src/hooks/useArticles.ts`) — NEW
```typescript
function useArticles() {
  return {
    articles: Article[],
    loading: boolean,
    error: string | null,
    createArticle: (article: Partial<Article>) => Promise<Article>,
    updateArticle: (id: string, updates: Partial<Article>) => Promise<void>,
    deleteArticle: (id: string) => Promise<void>,
    refetch: () => Promise<void>,
  }
}
```

### 5. API Helper (`src/lib/api.ts`) — UPDATE existing file
Add `generateArticle` function that calls the new edge function.

### 6. Navigation Update
- Add "Articles" link in sidebar (Layout.tsx) between "Create Post" and "Analytics"
- Add route `/articles` and `/articles/:id` in App.tsx
- Add article stats card on Dashboard

### 7. Markdown Preview
- Use a simple markdown-to-HTML renderer (can be basic: headers, bold, italic, lists, links, code blocks)
- No external library needed — write a simple parser or use basic regex replacement
- Preview modal shows the rendered article

## Design System (match existing app)
- Dark theme: bg-slate-900/80, bg-surface-950, border-white/10
- Accent: cyan-300, cyan-400
- Cards: rounded-[2rem], border border-white/10
- Labels: uppercase tracking-[0.2em] text-slate-400
- Buttons: rounded-2xl, bg-cyan-400 text-slate-950 for primary
- Use Lucide React icons

## File Structure
```
supabase/functions/
└── generate-article/
    └── index.ts              (NEW)
src/
├── components/
│   └── MarkdownPreview.tsx   (NEW - simple markdown renderer)
├── hooks/
│   ├── useArticles.ts        (NEW)
│   └── usePosts.ts           (existing - don't modify)
├── lib/
│   └── api.ts                (UPDATE - add generateArticle)
├── pages/
│   ├── Articles.tsx           (NEW - article list)
│   └── ArticleEditor.tsx      (NEW - editor + AI assistant)
├── types/
│   └── database.ts           (UPDATE - add Article types)
├── components/
│   └── Layout.tsx             (UPDATE - add Articles nav link)
└── App.tsx                    (UPDATE - add article routes)
```

## Acceptance Criteria
- [ ] Articles list page shows all articles with filters
- [ ] Can create new article from list page
- [ ] Article editor has title, subtitle, section-based content editing
- [ ] AI generates outline from title + pillar
- [ ] AI generates content per section
- [ ] AI generates promotion tweets
- [ ] Can save/update article
- [ ] Can delete article with confirmation
- [ ] Markdown preview modal works
- [ ] Word/character count updates live
- [ ] Navigation includes Articles link
- [ ] Dashboard shows article stats
- [ ] New routes work (/articles, /articles/:id)
- [ ] Edge function deployed with correct modes
- [ ] No TypeScript errors
- [ ] Build passes

## Important Notes
- Do NOT modify Calendar.tsx, PostModal.tsx, CreatePost.tsx, usePosts.ts, useAnalytics.ts, Analytics.tsx
- Do NOT modify the database schema (tables already exist)
- Match existing design system exactly
- Edge function at `supabase/functions/generate-article/index.ts`
- Use claude-sonnet-4-20250514 model in edge function
- Max tokens for section generation: 4000 (vs 600 for tweets)
