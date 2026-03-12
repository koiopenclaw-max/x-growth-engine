# Task 1: Supabase Database Schema

## Objective
Create the complete Supabase database schema for the X Growth Engine platform.

## Context
X Growth Engine is a content strategy + automation platform for growing an X (Twitter) account. Phase 1 is a manual-first tool: user creates content with AI assistance, manages a content calendar, and tracks analytics manually.

## Requirements

### Tables to Create

#### 1. `content_pillars`
- `id` UUID PK default gen_random_uuid()
- `name` TEXT NOT NULL UNIQUE
- `description` TEXT
- `color` TEXT (hex color for UI)
- `target_percentage` INTEGER (target % of total content)
- `created_at` TIMESTAMPTZ default now()

Seed data:
- AI & Vibecoding (40%, #8B5CF6)
- OpenClaw (25%, #06B6D4)
- Crypto & AI (20%, #F59E0B)
- Engagement & Community (15%, #10B981)

#### 2. `posts`
- `id` UUID PK default gen_random_uuid()
- `pillar_id` UUID FK → content_pillars.id
- `content` TEXT NOT NULL
- `post_type` post_type_enum NOT NULL
- `status` post_status_enum NOT NULL default 'draft'
- `scheduled_for` TIMESTAMPTZ
- `posted_at` TIMESTAMPTZ
- `x_post_url` TEXT (manual paste after posting)
- `ai_generated` BOOLEAN default false
- `ai_prompt` TEXT (the prompt used to generate)
- `notes` TEXT
- `created_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()

#### 3. `post_analytics`
- `id` UUID PK default gen_random_uuid()
- `post_id` UUID FK → posts.id UNIQUE
- `impressions` INTEGER default 0
- `likes` INTEGER default 0
- `retweets` INTEGER default 0
- `replies` INTEGER default 0
- `bookmarks` INTEGER default 0
- `profile_clicks` INTEGER default 0
- `link_clicks` INTEGER default 0
- `engagement_rate` DECIMAL(5,2) (calculated: (likes+retweets+replies+bookmarks)/impressions*100)
- `recorded_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()

#### 4. `account_snapshots`
- `id` UUID PK default gen_random_uuid()
- `date` DATE NOT NULL UNIQUE
- `followers` INTEGER NOT NULL
- `following` INTEGER NOT NULL
- `total_posts` INTEGER
- `impressions_today` INTEGER
- `profile_visits` INTEGER
- `notes` TEXT
- `created_at` TIMESTAMPTZ default now()

#### 5. `engagement_log`
- `id` UUID PK default gen_random_uuid()
- `action_type` engagement_type_enum NOT NULL
- `target_account` TEXT (@ handle of account engaged with)
- `target_post_url` TEXT
- `notes` TEXT
- `created_at` TIMESTAMPTZ default now()

### Enums

```sql
CREATE TYPE post_type_enum AS ENUM ('tweet', 'thread', 'reply', 'quote', 'poll');
CREATE TYPE post_status_enum AS ENUM ('draft', 'scheduled', 'posted', 'archived');
CREATE TYPE engagement_type_enum AS ENUM ('reply', 'quote', 'like', 'retweet', 'follow', 'dm');
```

### Indexes
- `posts.status` (filter by status)
- `posts.scheduled_for` (sort by schedule)
- `posts.pillar_id` (filter by pillar)
- `account_snapshots.date` (sort by date)
- `engagement_log.created_at` (sort by date)

### RLS (Row Level Security)
- Enable RLS on all tables
- For Phase 1 (single user): allow all operations for authenticated users
- Policy: `auth.role() = 'authenticated'`

### Additional
- `updated_at` trigger function for automatic timestamp updates
- All migrations in `supabase/migrations/` directory
- Single migration file: `001_initial_schema.sql`

## Output
Create file: `supabase/migrations/001_initial_schema.sql`

## Acceptance Criteria
- [ ] All 5 tables created with correct columns and types
- [ ] All 3 enums created
- [ ] Foreign keys with proper ON DELETE behavior (CASCADE for post_analytics, SET NULL for posts.pillar_id)
- [ ] All indexes created
- [ ] RLS enabled on all tables with authenticated user policies
- [ ] updated_at trigger function created and applied
- [ ] Seed data for content_pillars inserted
- [ ] SQL is valid and can run against a fresh Supabase instance
