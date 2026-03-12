# Task 2: React App Scaffolding

## Objective
Set up a complete React application with Vite, Tailwind CSS, Supabase client, authentication, and routing.

## Context
X Growth Engine is a content strategy platform for growing an X (Twitter) account. The Supabase backend is already set up with 5 tables (content_pillars, posts, post_analytics, account_snapshots, engagement_log). Now we need the frontend foundation.

## Tech Stack
- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS v3** for styling
- **React Router v6** for routing
- **Supabase JS client** (@supabase/supabase-js v2)
- **Lucide React** for icons

## Requirements

### 1. Initialize Vite + React + TypeScript
- Run `npm create vite@latest . -- --template react-ts` (use current directory)
- Install all dependencies

### 2. Tailwind CSS Setup
- Install and configure Tailwind CSS v3
- Create a clean base stylesheet with sensible defaults
- Dark mode support via class strategy

### 3. Supabase Client
Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4. Type Definitions
Create `src/types/database.ts` with TypeScript types matching the Supabase schema:
- ContentPillar, Post, PostAnalytics, AccountSnapshot, EngagementLog
- Enums: PostType, PostStatus, EngagementType

### 5. Authentication
Create `src/contexts/AuthContext.tsx`:
- AuthProvider wrapping the app
- useAuth() hook returning: user, session, signIn(email, password), signUp(email, password), signOut, loading
- Listen to auth state changes via supabase.auth.onAuthStateChange
- Persist session automatically (Supabase handles this)

Create `src/pages/Login.tsx`:
- Simple email/password login form
- Sign up link/toggle
- Error display
- Redirect to dashboard on success

### 6. Routing
Create `src/App.tsx` with React Router:
- `/login` → Login page
- `/` → Dashboard (protected, redirect to /login if not authenticated)
- `/calendar` → Content Calendar (protected)
- `/create` → Create Post (protected)
- `/analytics` → Analytics Dashboard (protected)

Create `src/components/ProtectedRoute.tsx`:
- Wraps protected routes
- Redirects to /login if no session
- Shows loading spinner while checking auth

### 7. Layout
Create `src/components/Layout.tsx`:
- Sidebar navigation with links to all pages
- Top bar with user info and sign out button
- Responsive: sidebar collapses to hamburger on mobile
- Active route highlighting
- App name "X Growth Engine" with logo placeholder

Create `src/pages/Dashboard.tsx`:
- Placeholder page with welcome message
- Cards for quick stats (will be filled in later tasks)
- Quick action buttons: "Create Post", "View Calendar", "Log Engagement"

### 8. Environment Variables
The `.env.local` file already exists with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Create `.env.example` with placeholder values for documentation.

## File Structure
```
src/
├── App.tsx
├── main.tsx
├── index.css
├── vite-env.d.ts
├── components/
│   ├── Layout.tsx
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   └── useAuth.ts (re-export from context)
├── lib/
│   └── supabase.ts
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Calendar.tsx (placeholder)
│   ├── CreatePost.tsx (placeholder)
│   └── Analytics.tsx (placeholder)
├── types/
│   └── database.ts
└── styles/
    └── (Tailwind handles this)
```

## Acceptance Criteria
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` completes without errors
- [ ] Tailwind CSS classes render correctly
- [ ] Supabase client initializes without errors
- [ ] Login page renders with email/password form
- [ ] Protected routes redirect to login when not authenticated
- [ ] Layout has working sidebar navigation
- [ ] Dashboard shows placeholder content
- [ ] All TypeScript types match the database schema
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)

## Important Notes
- Do NOT modify any files in `supabase/` directory
- Do NOT modify `.env.local` 
- The app should work immediately with `npm run dev` after setup
- Keep the design clean and modern - dark theme preferred
