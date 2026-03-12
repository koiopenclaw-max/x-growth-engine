import { createClient } from 'jsr:@supabase/supabase-js@2'

type PostType = 'tweet' | 'thread' | 'reply' | 'quote' | 'poll'
type Tone = 'witty' | 'professional' | 'casual' | 'provocative'

interface GeneratePostRequest {
  pillar: string
  post_type: PostType
  topic: string
  tone?: Tone
  context?: string
}

interface GeneratePostResponse {
  content: string
  suggestions?: string[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POST_TYPES = new Set<PostType>(['tweet', 'thread', 'reply', 'quote', 'poll'])
const TONES = new Set<Tone>(['witty', 'professional', 'casual', 'provocative'])

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function buildSystemPrompt(input: GeneratePostRequest) {
  return [
    'You are an expert X/Twitter content strategist for the account @KoiNov1.',
    'The account lives at the intersection of AI, vibecoding, OpenClaw, and crypto.',
    'Write content that feels native to X: clear hook, scroll-stopping first line, strong point of view, and concise phrasing.',
    'Optimize for engagement without sounding spammy.',
    'Respect the requested post type exactly.',
    'For tweet, reply, quote, and poll outputs: keep the main content within 280 characters unless the user explicitly asks for longer.',
    'For threads: generate 3 to 7 connected posts, each on its own line block, numbered 1/, 2/, 3/, etc.',
    'Use hashtags sparingly and only when they add value.',
    `Adapt the tone to "${input.tone ?? 'casual'}".`,
    'Return valid JSON only with this exact shape: {"content":"string","suggestions":["string","string","string"]}.',
    'Suggestions must be 2 or 3 alternative hooks or angles, short enough to scan quickly.',
    'Do not wrap the JSON in markdown fences.',
  ].join(' ')
}

function buildUserPrompt(input: GeneratePostRequest) {
  return [
    `Pillar: ${input.pillar}`,
    `Post type: ${input.post_type}`,
    `Topic: ${input.topic}`,
    `Tone: ${input.tone ?? 'casual'}`,
    `Additional context: ${input.context?.trim() || 'None provided.'}`,
  ].join('\n')
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

function safeParseGeneratedPayload(rawText: string): GeneratePostResponse | null {
  try {
    const parsed = JSON.parse(rawText) as GeneratePostResponse

    if (typeof parsed.content !== 'string' || !parsed.content.trim()) {
      return null
    }

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
      : undefined

    return {
      content: parsed.content.trim(),
      suggestions,
    }
  } catch {
    return null
  }
}

function validateInput(payload: unknown): GeneratePostRequest | string {
  if (!payload || typeof payload !== 'object') {
    return 'Request body must be a JSON object.'
  }

  const { pillar, post_type, topic, tone, context } = payload as Record<string, unknown>

  if (typeof pillar !== 'string' || !pillar.trim()) {
    return 'The "pillar" field is required.'
  }

  if (typeof post_type !== 'string' || !POST_TYPES.has(post_type as PostType)) {
    return 'The "post_type" field must be one of tweet, thread, reply, quote, or poll.'
  }

  if (typeof topic !== 'string' || !topic.trim()) {
    return 'The "topic" field is required.'
  }

  if (tone !== undefined && (typeof tone !== 'string' || !TONES.has(tone as Tone))) {
    return 'The "tone" field must be witty, professional, casual, or provocative.'
  }

  if (context !== undefined && typeof context !== 'string') {
    return 'The "context" field must be a string.'
  }

  return {
    pillar: pillar.trim(),
    post_type: post_type as PostType,
    topic: topic.trim(),
    tone: typeof tone === 'string' ? (tone as Tone) : undefined,
    context: typeof context === 'string' && context.trim() ? context.trim() : undefined,
  }
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
        max_tokens: validated.post_type === 'thread' ? 1200 : 600,
        system: buildSystemPrompt(validated),
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
        {
          error: providerMessage,
        },
        anthropicResponse.status >= 400 && anthropicResponse.status < 600 ? anthropicResponse.status : 502,
      )
    }

    const anthropicPayload = (await anthropicResponse.json()) as Record<string, unknown>
    const rawText = extractTextFromAnthropic(anthropicPayload)
    const parsed = safeParseGeneratedPayload(rawText)

    if (!parsed) {
      return jsonResponse({ error: 'The AI response could not be parsed into the expected format.' }, 502)
    }

    return jsonResponse(parsed satisfies GeneratePostResponse)
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error while generating content.',
      },
      500,
    )
  }
})
