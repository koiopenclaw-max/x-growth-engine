# Task 10: Improve Article Editor — Context & Control

## Objective
Add better AI steering controls to the Article Editor: topic/context field, per-section instructions, and tone selector. This allows users to guide AI generation with specific details about their story and what they want in each section.

## Current Problem
AI generates generic outlines and content because it lacks context. Users can't tell the AI "I want this section to cover my experience with Lovable" or "make this section a step-by-step tutorial."

## Changes Required

### 1. Add "Topic & Context" textarea to AI Assistant panel
In `src/pages/ArticleEditor.tsx`, add a textarea in the right panel (AI Assistant section) ABOVE the Generate Outline button:

```
Label: "Topic & Context"
Placeholder: "Describe what this article is about, your personal experience, specific points you want to cover, examples to include..."
```

This textarea value should be sent as the `topic` parameter to ALL AI generation calls (outline, section, hook, promotion).

### 2. Add "Tone" selector to AI Assistant panel
Add a dropdown/select below the Topic & Context textarea:

Options: "Professional", "Witty & Casual", "Tutorial / Step-by-step", "Storytelling", "Data-driven / Analytical", "Provocative / Contrarian"

Send as the `tone` parameter to section and hook generation calls.

### 3. Add per-section "Instructions" field
For each section in the outline, add a small textarea/input below the section title:

```
Label: "AI Instructions for this section"
Placeholder: "What should this section cover? Any specific examples, data, or stories to include..."
```

This should be sent as `section_context` when generating content for that specific section. Combine with the global Topic & Context.

### 4. Update the AI generation calls

**Generate Outline:**
- Send `topic` from the Topic & Context textarea (not just subtitle/notes)

**Generate Content (per section):**
- Send `section_context` = global Topic & Context + section-specific instructions
- Send `tone` from tone selector

**Generate Hook:**
- Send `topic` from Topic & Context textarea

**Generate Promotion:**
- Send topic context for better tweets

### 5. Update Edge Function system prompts
Update `supabase/functions/generate-article/index.ts`:

For **outline** mode, update the system prompt to:
- Use the topic/context to create SPECIFIC, tailored sections (not generic)
- Include the user's personal experiences/examples mentioned in context
- Create sections that tell a story arc, not just topic headers

For **section** mode, update the system prompt to:
- Follow the section-specific instructions closely
- Use the global context for background/details
- Respect the chosen tone
- Include specific examples, numbers, and personal details from the context
- Write in first person when context describes personal experience

For **hook** mode, update to use the full context for more relevant hooks.

## EditorState Changes
Add to the EditorState interface:
```typescript
topic_context: string    // global topic & context for AI
tone: string             // selected tone
```

Add per-section instructions to ArticleSection:
```typescript
// In the outline state, add instructions field to each section
// This is UI-only, doesn't need to be saved to DB
```

Actually, store section instructions in a separate state Map<string, string> (sectionId → instructions) so we don't modify the ArticleSection type that maps to DB.

## UI Layout (right panel)
```
AI Assistant
├── Pillar selector (existing)
├── Topic & Context textarea (NEW)
├── Tone selector (NEW)
├── Generate Outline button (existing)
├── Generate Content button (existing) 
├── Generate Hook button (existing)
├── Section Instructions textarea (NEW - shows when section selected)
├── Improve instruction (existing)
├── Improve Section button (existing)
├── SEO button (existing)
├── Promotion button (existing)
└── AI Preview area (existing)
```

## Design
Match existing: dark theme, rounded inputs, cyan accents, uppercase labels.

## Acceptance Criteria
- [ ] Topic & Context textarea appears in AI panel
- [ ] Tone selector with 6 options appears in AI panel
- [ ] Per-section instructions textarea appears when a section is selected
- [ ] Generate Outline uses topic context for specific results
- [ ] Generate Content uses section instructions + tone + global context
- [ ] Generate Hook uses topic context
- [ ] Edge function prompts updated for better, context-aware generation
- [ ] No TypeScript errors
- [ ] Build passes

## Important Notes
- Only modify: ArticleEditor.tsx and generate-article/index.ts
- Do NOT modify other pages/components
- Keep existing functionality working
- The section instructions map is UI-only state, not persisted to DB
