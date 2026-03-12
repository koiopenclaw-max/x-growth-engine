import { supabase } from './supabase'

export interface GeneratePostParams {
  pillar: string
  post_type: 'tweet' | 'thread' | 'reply' | 'quote' | 'poll'
  topic: string
  tone?: 'witty' | 'professional' | 'casual' | 'provocative'
  context?: string
}

export interface GeneratePostResult {
  content: string
  suggestions?: string[]
}

export async function generatePost(params: GeneratePostParams): Promise<GeneratePostResult> {
  const { data, error } = await supabase.functions.invoke<GeneratePostResult>('generate-post', {
    body: params,
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate AI post.')
  }

  if (!data?.content) {
    throw new Error('AI generation returned an empty response.')
  }

  return data
}
