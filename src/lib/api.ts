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

export type ArticleGenerationMode = 'outline' | 'section' | 'hook' | 'improve' | 'seo' | 'promotion'

interface BaseGenerateArticleParams {
  mode: ArticleGenerationMode
}

export interface GenerateArticleOutlineParams extends BaseGenerateArticleParams {
  mode: 'outline'
  title: string
  pillar: string
  topic?: string
}

export interface GenerateArticleSectionParams extends BaseGenerateArticleParams {
  mode: 'section'
  title: string
  pillar: string
  section_title: string
  section_context?: string
  tone?: string
}

export interface GenerateArticleHookParams extends BaseGenerateArticleParams {
  mode: 'hook'
  title: string
  pillar: string
  topic?: string
}

export interface GenerateArticleImproveParams extends BaseGenerateArticleParams {
  mode: 'improve'
  content: string
  instruction: string
}

export interface GenerateArticleSeoParams extends BaseGenerateArticleParams {
  mode: 'seo'
  title: string
  content_summary: string
}

export interface GenerateArticlePromotionParams extends BaseGenerateArticleParams {
  mode: 'promotion'
  title: string
  summary: string
  key_points?: string[]
}

export type GenerateArticleParams =
  | GenerateArticleOutlineParams
  | GenerateArticleSectionParams
  | GenerateArticleHookParams
  | GenerateArticleImproveParams
  | GenerateArticleSeoParams
  | GenerateArticlePromotionParams

export interface GenerateArticleOutlineResult {
  sections: Array<{ title: string; description: string }>
}

export interface GenerateArticleSectionResult {
  content: string
}

export interface GenerateArticleHookResult {
  hooks: string[]
}

export interface GenerateArticleSeoResult {
  keywords: string[]
  meta_description: string
}

export interface GenerateArticlePromotionResult {
  tweets: string[]
}

export type GenerateArticleResult =
  | GenerateArticleOutlineResult
  | GenerateArticleSectionResult
  | GenerateArticleHookResult
  | GenerateArticleSeoResult
  | GenerateArticlePromotionResult

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

export async function generateArticle<T extends GenerateArticleResult>(params: GenerateArticleParams): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('generate-article', {
    body: params,
  })

  if (error) {
    throw new Error(error.message || 'Unable to generate article content.')
  }

  if (!data) {
    throw new Error('AI generation returned an empty response.')
  }

  return data
}
