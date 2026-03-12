# Task 3: Content Calendar UI

## Objective
Build a fully functional Content Calendar page with CRUD operations for posts, pillar filtering, status management, and a clean calendar/list view.

## Context
X Growth Engine is a content strategy platform. The Supabase backend has these tables: `posts`, `content_pillars`, `post_analytics`, `account_snapshots`, `engagement_log`. The React frontend is scaffolded with Vite + Tailwind + Supabase Auth + React Router. The Calendar page (`src/pages/Calendar.tsx`) is currently a placeholder.

## Existing Code
- `src/lib/supabase.ts` — Supabase client (already configured)
- `src/types/database.ts` — TypeScript types for all tables
- `src/contexts/AuthContext.tsx` — Auth context with useAuth hook
- `src/pages/Calendar.tsx` — Placeholder (replace entirely)
- `src/components/Layout.tsx` — Sidebar layout (don't modify)
- Tailwind is configured with dark theme, cyan accents, surface colors

## Design System (match existing)
- Dark theme: bg-slate-900/80, bg-surface-950, border-white/10
- Accent: cyan-300, cyan-400
- Cards: rounded-[2rem] or rounded-[1.75rem], border border-white/10
- Text: uppercase tracking-[0.3em] for labels, font-serif for headings
- Buttons: rounded-2xl, bg-cyan-400 text-slate-950 for primary
- Use Lucide React icons (already installed)

## Requirements

### 1. Calendar Page (`src/pages/Calendar.tsx`)
Replace placeholder with full content calendar featuring:

**Header Section:**
- Title "Content Calendar" with pillar distribution bar (visual % of each pillar, colored)
- Filter buttons: All | by status (Draft, Scheduled, Posted, Archived)
- Filter by pillar (dropdown or buttons, colored by pillar color)
- "New Post" button → opens create/edit modal

**View: List/Card View**
- Display posts as cards in a list, grouped by date (scheduled_for or created_at)
- Each card shows:
  - Post content (truncated to 2 lines)
  - Pillar badge (colored dot + name)
  - Status badge (colored: draft=gray, scheduled=blue, posted=green, archived=red)
  - Post type badge (tweet/thread/reply/quote/poll)
  - Scheduled date/time
  - Quick actions: Edit, Delete, Change Status
- Empty state when no posts

### 2. Post Create/Edit Modal (`src/components/PostModal.tsx`)
A modal dialog for creating and editing posts:
- **Content** textarea (required, with character count — X limit is 280 for tweets)
- **Pillar** select dropdown (load from content_pillars table)
- **Post Type** select (tweet, thread, reply, quote, poll)
- **Status** select (draft, scheduled, posted, archived)
- **Scheduled For** datetime picker (only shown when status is "scheduled")
- **X Post URL** text input (only shown when status is "posted")
- **Notes** textarea (optional)
- **AI Generated** checkbox
- Save / Cancel buttons
- Loading state during save
- Validation: content required, scheduled_for required if status=scheduled

### 3. Data Layer (`src/hooks/usePosts.ts`)
Custom hook for post CRUD:
```typescript
function usePosts() {
  return {
    posts: Post[],
    pillars: ContentPillar[],
    loading: boolean,
    error: string | null,
    createPost: (post: Partial<Post>) => Promise<void>,
    updatePost: (id: string, updates: Partial<Post>) => Promise<void>,
    deletePost: (id: string) => Promise<void>,
    refetch: () => Promise<void>,
  }
}
```
- Fetch posts with pillar data (join or separate query)
- Order by scheduled_for DESC, then created_at DESC
- Real-time not needed in Phase 1

### 4. Status Flow
Posts follow this lifecycle:
- draft → scheduled (requires scheduled_for date)
- scheduled → posted (set posted_at = now)
- posted → archived
- Any status → draft (reset)

Quick status change buttons on each card for common transitions.

### 5. Delete Confirmation
Simple confirmation dialog before deleting a post.

## File Structure
```
src/
├── components/
│   ├── PostModal.tsx        (NEW - create/edit modal)
│   └── DeleteConfirm.tsx    (NEW - delete confirmation)
├── hooks/
│   └── usePosts.ts          (NEW - post CRUD hook)
└── pages/
    └── Calendar.tsx          (REPLACE - full calendar page)
```

## Acceptance Criteria
- [ ] Calendar page displays posts from Supabase
- [ ] Can create a new post via modal
- [ ] Can edit an existing post
- [ ] Can delete a post (with confirmation)
- [ ] Can filter by status
- [ ] Can filter by pillar
- [ ] Pillar distribution bar shows correct percentages
- [ ] Status badges are color-coded
- [ ] Character count shows for tweet content
- [ ] Scheduled datetime picker appears only when status=scheduled
- [ ] X Post URL field appears only when status=posted
- [ ] Empty state shown when no posts match filters
- [ ] No TypeScript errors
- [ ] Build passes (`npm run build`)

## Important Notes
- Do NOT modify Layout.tsx, AuthContext.tsx, or supabase.ts
- Do NOT modify any files in `supabase/` directory
- Match the existing design system (dark theme, cyan accents, rounded cards)
- Use the existing types from `src/types/database.ts`
- All Supabase queries should handle errors gracefully
