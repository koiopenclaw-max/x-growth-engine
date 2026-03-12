# Task 5: Analytics Dashboard

## Objective
Build an Analytics Dashboard page with manual stat input for account snapshots, post performance display, engagement logging, and charts using Recharts.

## Context
X Growth Engine has a working Content Calendar (Task 3) and AI Content Generator (Task 4). Now we need the analytics side: tracking follower growth, post performance, and engagement activities. All data entry is manual in Phase 1.

## Dependencies
- Install `recharts` package: `npm install recharts`
- Existing: Supabase client, types, auth context, usePosts hook

## Requirements

### 1. Analytics Page (`src/pages/Analytics.tsx`)
Replace the placeholder with a full analytics dashboard:

**Section A: Account Overview**
- Form to add daily account snapshot (followers, following, total posts, impressions, profile visits)
- Today's date auto-filled
- Save to `account_snapshots` table
- Display last 7 snapshots in a table

**Section B: Follower Growth Chart**
- Line chart (Recharts) showing follower count over time
- Data from `account_snapshots` table
- X-axis: date, Y-axis: followers
- Styled to match dark theme

**Section C: Post Performance**
- List of posted posts with their analytics
- For each post: show content (truncated), impressions, likes, retweets, replies, bookmarks, engagement rate
- "Add/Edit Stats" button opens inline form to input analytics for a post
- Save to `post_analytics` table
- Sort by engagement rate descending

**Section D: Engagement Log**
- Form to log engagement actions (reply, quote, like, retweet, follow, DM)
- Fields: action type, target account (@handle), target post URL, notes
- Save to `engagement_log` table
- Display recent 20 engagement actions in a list
- Summary stats: total actions today, this week

### 2. Data Hooks

**`src/hooks/useAnalytics.ts`**
```typescript
function useAnalytics() {
  return {
    snapshots: AccountSnapshot[],
    postAnalytics: Map<string, PostAnalytics>,
    engagementLog: EngagementLog[],
    loading: boolean,
    error: string | null,
    addSnapshot: (snapshot: Partial<AccountSnapshot>) => Promise<void>,
    upsertPostAnalytics: (postId: string, analytics: Partial<PostAnalytics>) => Promise<void>,
    addEngagement: (entry: Partial<EngagementLog>) => Promise<void>,
    refetch: () => Promise<void>,
  }
}
```

### 3. Charts Configuration
- Use Recharts components: LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
- Dark theme: grid stroke #1e293b, line stroke #22d3ee (cyan-400), tooltip bg #0f172a
- Responsive container with 100% width and 300px height

### 4. Engagement Summary Card
- Show: total engagements today, total this week, most engaged account
- Color-coded by action type

## Design System (match existing)
- Dark theme: bg-slate-900/80, border-white/10, cyan accents
- Cards: rounded-[2rem], rounded-[1.75rem]
- Labels: uppercase tracking-[0.3em] text-slate-400
- Headings: font-serif text-white
- Buttons: rounded-2xl
- Use Lucide React icons

## File Structure
```
src/
├── hooks/
│   └── useAnalytics.ts      (NEW)
└── pages/
    └── Analytics.tsx         (REPLACE)
```

## Acceptance Criteria
- [ ] Can add daily account snapshot
- [ ] Follower growth chart renders with Recharts
- [ ] Can view and add post analytics
- [ ] Can log engagement actions
- [ ] Engagement summary shows today/week counts
- [ ] Recent snapshots table displays correctly
- [ ] Recent engagement log displays correctly
- [ ] Chart styled for dark theme
- [ ] No TypeScript errors
- [ ] Build passes

## Important Notes
- Install recharts: `npm install recharts`
- Do NOT modify Layout.tsx, Calendar.tsx, CreatePost.tsx, PostModal.tsx
- Do NOT modify the database schema
- Match existing design system
- Handle empty states gracefully
