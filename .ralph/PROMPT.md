# Task 4: AI Content Generator

## Objective
Build an AI-powered post creation flow using Claude API via Supabase Edge Function, plus a frontend UI for generating, reviewing, and saving AI-drafted posts.

## Context
X Growth Engine has a working Content Calendar (Task 3) with full CRUD. Now we need AI assistance for content creation. The user provides a topic/prompt, selects a pillar and post type, and the AI generates a draft tweet/thread that the user can edit and save to the calendar.

## Architecture
- **Supabase Edge Function** (`generate-post`) handles Claude API calls server-side
- **Frontend UI** on the Create Post page sends requests to the edge function
- API key stays server-side (never exposed to browser)

## Requirements

### 1. Supabase Edge Function (`supabase/functions/generate-post/index.ts`)

**Input (JSON body):**
```typescript
{
  pillar: string,        // pillar name (e.g. "AI & Vibecoding")
  post_type: string,     // tweet | thread | reply | quote | poll
  topic: string,         // user's topic/prompt
  tone?: string,         // optional: witty, professional, casual, provocative
  context?: string,      // optional: additional context
}
```

**Processing:**
- Call Claude API (model: claude-sonnet-4-20250514) with a system prompt that:
  - Acts as an expert X/Twitter content strategist
  - Knows the account is @KoiNov1 in the AI/Vibecoding/OpenClaw/Crypto niche
  - Generates content optimized for X engagement (hooks, threads, hashtags)
  - Respects character limits (280 for tweets, longer for threads)
  - Adapts tone based on the tone parameter
  - For threads: generates 3-7 connected tweets with numbering
- Return the generated content as JSON

**Output:**
```typescript
{
  content: string,       // the generated post text
  suggestions?: string[], // 2-3 alternative hooks or angles
}
```

**Environment:**
- `ANTHROPIC_API_KEY` — set as Supabase secret
- Edge function should handle errors gracefully and return proper HTTP status codes

### 2. Create Post Page (`src/pages/CreatePost.tsx`)
Replace the placeholder with a full AI content creation workflow:

**Step 1: Configure Generation**
- Pillar selector (load from content_pillars, show colored badges)
- Post type selector (tweet, thread, reply, quote, poll)
- Topic/prompt textarea ("What do you want to post about?")
- Tone selector (witty, professional, casual, provocative) — optional
- Additional context textarea — optional
- "Generate with AI" button

**Step 2: Review & Edit**
- Show generated content in an editable textarea
- Character count (with color indicator: green <250, yellow 250-270, red >280)
- Show AI suggestions as clickable chips (clicking replaces content)
- "Regenerate" button (sends same config again)
- "Save as Draft" button → saves to posts table with ai_generated=true, ai_prompt=topic
- "Save & Schedule" button → opens datetime picker, saves with status=scheduled

**Design:**
- Match existing dark theme (bg-slate-900/80, cyan accents, rounded cards)
- Two-column layout on desktop: config on left, preview on right
- Mobile: stacked layout

### 3. Edge Function Deployment
Create the edge function file at `supabase/functions/generate-post/index.ts`

The function should:
- Verify the request has a valid Supabase auth token (check Authorization header)
- Parse and validate the JSON body
- Call Claude API using fetch (no SDK needed)
- Return structured response
- Handle rate limits and errors

### 4. Frontend API Integration (`src/lib/api.ts`)
Create a helper function:
```typescript
export async function generatePost(params: {
  pillar: string
  post_type: string
  topic: string
  tone?: string
  context?: string
}): Promise<{ content: string; suggestions?: string[] }>
```
- Calls the Supabase Edge Function via `supabase.functions.invoke('generate-post', { body: params })`
- Handles errors and returns typed response

## File Structure
```
supabase/
└── functions/
    └── generate-post/
        └── index.ts         (NEW - Edge Function)
src/
├── lib/
│   └── api.ts               (NEW - API helpers)
└── pages/
    └── CreatePost.tsx        (REPLACE - full AI creation page)
```

## Acceptance Criteria
- [ ] Edge function file created with proper Claude API integration
- [ ] CreatePost page has pillar/type/topic/tone inputs
- [ ] "Generate with AI" calls the edge function
- [ ] Generated content appears in editable textarea
- [ ] Character count with color indicators
- [ ] AI suggestions shown as clickable chips
- [ ] "Save as Draft" creates post with ai_generated=true
- [ ] "Save & Schedule" creates post with scheduled status
- [ ] Error handling for API failures
- [ ] No TypeScript errors
- [ ] Build passes

## Important Notes
- Do NOT modify Layout.tsx, Calendar.tsx, PostModal.tsx, or supabase.ts
- Do NOT modify the database schema
- The Edge Function won't work locally without `supabase functions serve` — that's OK
- Use `supabase.functions.invoke()` for the frontend call (handles auth automatically)
- The ANTHROPIC_API_KEY will be set as a Supabase secret separately (not in code)
- For the Claude API call, use direct fetch to `https://api.anthropic.com/v1/messages`
