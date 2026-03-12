import { createClient } from 'jsr:@supabase/supabase-js@2'

type ArticleMode = 'outline' | 'section' | 'hook' | 'improve' | 'seo' | 'promotion'

interface OutlineRequest {
  mode: 'outline'
  title: string
  pillar: string
  topic?: string
}

interface SectionRequest {
  mode: 'section'
  title: string
  pillar: string
  section_title: string
  section_context?: string
  tone?: string
}

interface HookRequest {
  mode: 'hook'
  title: string
  pillar: string
  topic?: string
}

interface ImproveRequest {
  mode: 'improve'
  content: string
  instruction: string
}

interface SeoRequest {
  mode: 'seo'
  title: string
  content_summary: string
}

interface PromotionRequest {
  mode: 'promotion'
  title: string
  summary: string
  key_points?: string[]
}

type GenerateArticleRequest =
  | OutlineRequest
  | SectionRequest
  | HookRequest
  | ImproveRequest
  | SeoRequest
  | PromotionRequest

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODES = new Set<ArticleMode>(['outline', 'section', 'hook', 'improve', 'seo', 'promotion'])

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function extractTextFromAnthropic(payload: Record<string, unknown>) {
  const content = Array.isArray(payload.content) ? payload.content : []

  return content
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return ''
      }

      const text = 'text' in item ? item.text : ''
      return typeof text === 'string' ? text : ''
    })
    .join('\n')
    .trim()
}

function buildSystemPrompt(mode: ArticleMode) {
  const base = [
    'You are the article strategist and writer for the X account @KoiNov1.',
    'The account niche is AI, vibecoding, OpenClaw, and crypto.',
    'The audience is global English-speaking builders, operators, and curious internet natives.',
    'Write with sharp opinions, practical detail, and strong hooks.',
    'Avoid filler, vague hype, and generic corporate phrasing.',
    'Return valid JSON only. Do not include markdown fences.',
  ]

  if (mode === 'outline') {
    return [
      ...base,
      'Return exactly {"sections":[{"title":"string","description":"string"}]}.',
      'Create 5 to 7 sections with specific, useful titles and compact descriptions.',
    ].join(' ')
  }

  if (mode === 'section') {
    return [
      ...base,
      'Return exactly {"content":"string"}.',
      'Write a substantial section between 500 and 1500 words unless the context clearly suggests a shorter section.',
      'Use markdown-friendly formatting and concrete examples where helpful.',
    ].join(' ')
  }

  if (mode === 'hook') {
    return [
      ...base,
      'Return exactly {"hooks":["string","string","string"]}.',
      'Generate 3 opening paragraph options that can lead the article.',
    ].join(' ')
  }

  if (mode === 'improve') {
    return [
      ...base,
      'Return exactly {"content":"string"}.',
      'Rewrite the given content according to the instruction while preserving the underlying point.',
    ].join(' ')
  }

  if (mode === 'seo') {
    return [
      ...base,
      'Return exactly {"keywords":["string"],"meta_description":"string"}.',
      'Provide 5 to 10 SEO keywords and one concise meta description.',
    ].join(' ')
  }

  return [
    ...base,
    'Return exactly {"tweets":["string"]}.',
    'Generate 3 to 5 promotion tweets that feel native to X and point readers toward the article.',
    'Keep each tweet concise enough for X posting.',
  ].join(' ')
}

function buildUserPrompt(input: GenerateArticleRequest) {
  if (input.mode === 'outline') {
    return [`Mode: outline`, `Title: ${input.title}`, `Pillar: ${input.pillar}`, `Topic: ${input.topic ?? 'None provided.'}`].join('\n')
  }

  if (input.mode === 'section') {
    return [
      `Mode: section`,
      `Article title: ${input.title}`,
      `Pillar: ${input.pillar}`,
      `Section title: ${input.section_title}`,
      `Section context: ${input.section_context ?? 'None provided.'}`,
      `Tone: ${input.tone ?? 'clear, practical, direct'}`,
    ].join('\n')
  }

  if (input.mode === 'hook') {
    return [`Mode: hook`, `Title: ${input.title}`, `Pillar: ${input.pillar}`, `Topic: ${input.topic ?? 'None provided.'}`].join('\n')
  }

  if (input.mode === 'improve') {
    return [`Mode: improve`, `Instruction: ${input.instruction}`, `Content:\n${input.content}`].join('\n')
  }

  if (input.mode === 'seo') {
    return [`Mode: seo`, `Title: ${input.title}`, `Content summary: ${input.content_summary}`].join('\n')
  }

  return [
    `Mode: promotion`,
    `Title: ${input.title}`,
    `Summary: ${input.summary}`,
    `Key points: ${input.key_points?.join(' | ') || 'None provided.'}`,
  ].join('\n')
}

function validateInput(payload: unknown): GenerateArticleRequest | string {
  if (!payload || typeof payload !== 'object') {
    return 'Request body must be a JSON object.'
  }

  const body = payload as Record<string, unknown>

  if (typeof body.mode !== 'string' || !MODES.has(body.mode as ArticleMode)) {
    return 'The "mode" field must be outline, section, hook, improve, seo, or promotion.'
  }

  if (body.mode === 'outline') {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return 'The "title" field is required.'
    }

    if (typeof body.pillar !== 'string' || !body.pillar.trim()) {
      return 'The "pillar" field is required.'
    }

    if (body.topic !== undefined && typeof body.topic !== 'string') {
      return 'The "topic" field must be a string.'
    }

    return {
      mode: 'outline',
      title: body.title.trim(),
      pillar: body.pillar.trim(),
      topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : undefined,
    }
  }

  if (body.mode === 'section') {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return 'The "title" field is required.'
    }

    if (typeof body.pillar !== 'string' || !body.pillar.trim()) {
      return 'The "pillar" field is required.'
    }

    if (typeof body.section_title !== 'string' || !body.section_title.trim()) {
      return 'The "section_title" field is required.'
    }

    if (body.section_context !== undefined && typeof body.section_context !== 'string') {
      return 'The "section_context" field must be a string.'
    }

    if (body.tone !== undefined && typeof body.tone !== 'string') {
      return 'The "tone" field must be a string.'
    }

    return {
      mode: 'section',
      title: body.title.trim(),
      pillar: body.pillar.trim(),
      section_title: body.section_title.trim(),
      section_context: typeof body.section_context === 'string' && body.section_context.trim() ? body.section_context.trim() : undefined,
      tone: typeof body.tone === 'string' && body.tone.trim() ? body.tone.trim() : undefined,
    }
  }

  if (body.mode === 'hook') {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return 'The "title" field is required.'
    }

    if (typeof body.pillar !== 'string' || !body.pillar.trim()) {
      return 'The "pillar" field is required.'
    }

    return {
      mode: 'hook',
      title: body.title.trim(),
      pillar: body.pillar.trim(),
      topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : undefined,
    }
  }

  if (body.mode === 'improve') {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return 'The "content" field is required.'
    }

    if (typeof body.instruction !== 'string' || !body.instruction.trim()) {
      return 'The "instruction" field is required.'
    }

    return {
      mode: 'improve',
      content: body.content.trim(),
      instruction: body.instruction.trim(),
    }
  }

  if (body.mode === 'seo') {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return 'The "title" field is required.'
    }

    if (typeof body.content_summary !== 'string' || !body.content_summary.trim()) {
      return 'The "content_summary" field is required.'
    }

    return {
      mode: 'seo',
      title: body.title.trim(),
      content_summary: body.content_summary.trim(),
    }
  }

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return 'The "title" field is required.'
  }

  if (typeof body.summary !== 'string' || !body.summary.trim()) {
    return 'The "summary" field is required.'
  }

  if (body.key_points !== undefined && (!Array.isArray(body.key_points) || body.key_points.some((item) => typeof item !== 'string'))) {
    return 'The "key_points" field must be an array of strings.'
  }

  return {
    mode: 'promotion',
    title: body.title.trim(),
    summary: body.summary.trim(),
    key_points: Array.isArray(body.key_points) ? body.key_points.map((item) => String(item).trim()).filter(Boolean) : undefined,
  }
}

function validateResponse(mode: ArticleMode, rawText: string) {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>

    if (mode === 'outline') {
      const sections = Array.isArray(parsed.sections)
        ? parsed.sections
            .map((item) => {
              if (!item || typeof item !== 'object') {
                return null
              }

              const record = item as Record<string, unknown>
              if (typeof record.title !== 'string' || typeof record.description !== 'string') {
                return null
              }

              return { title: record.title.trim(), description: record.description.trim() }
            })
            .filter(Boolean)
        : []

      if (!sections.length) {
        return null
      }

      return { sections }
    }

    if (mode === 'section' || mode === 'improve') {
      if (typeof parsed.content !== 'string' || !parsed.content.trim()) {
        return null
      }

      return { content: parsed.content.trim() }
    }

    if (mode === 'hook') {
      const hooks = Array.isArray(parsed.hooks)
        ? parsed.hooks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
        : []

      return hooks.length ? { hooks } : null
    }

    if (mode === 'seo') {
      const keywords = Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 10)
        : []

      if (typeof parsed.meta_description !== 'string' || !parsed.meta_description.trim() || !keywords.length) {
        return null
      }

      return {
        keywords,
        meta_description: parsed.meta_description.trim(),
      }
    }

    const tweets = Array.isArray(parsed.tweets)
      ? parsed.tweets.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : []

    return tweets.length ? { tweets } : null
  } catch {
    return null
  }
}

function maxTokensForMode(mode: ArticleMode) {
  if (mode === 'section') {
    return 4000
  }

  if (mode === 'promotion') {
    return 600
  }

  return 1200
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing or invalid Authorization header.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase environment variables are not configured.' }, 500)
  }

  if (!anthropicApiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured.' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized.' }, 401)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const validated = validateInput(body)

  if (typeof validated === 'string') {
    return jsonResponse({ error: validated }, 400)
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokensForMode(validated.mode),
        system: buildSystemPrompt(validated.mode),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(validated),
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorPayload = (await anthropicResponse.json().catch(() => null)) as
        | { error?: { message?: string; type?: string } }
        | null

      const providerMessage = errorPayload?.error?.message ?? 'Anthropic request failed.'
      const providerType = errorPayload?.error?.type

      if (anthropicResponse.status === 429 || providerType === 'rate_limit_error') {
        return jsonResponse({ error: 'Rate limit reached. Please wait a moment and try again.' }, 429)
      }

      return jsonResponse(
        { error: providerMessage },
        anthropicResponse.status >= 400 && anthropicResponse.status < 600 ? anthropicResponse.status : 502,
      )
    }

    const anthropicPayload = (await anthropicResponse.json()) as Record<string, unknown>
    const rawText = extractTextFromAnthropic(anthropicPayload)
    const parsed = validateResponse(validated.mode, rawText)

    if (!parsed) {
      return jsonResponse({ error: 'The AI response could not be parsed into the expected format.' }, 502)
    }

    return jsonResponse(parsed as Record<string, unknown>)
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error while generating article content.',
      },
      500,
    )
  }
})
