import { MediaContent } from '@/lib/media-extractor'

export interface TweetData {
  html: string
  authorName: string
  authorUrl: string
  url: string
  text: string
  width: number
  height: number
  mediaContent: MediaContent[]
  mediaText: string
}

export interface TweetApiResponse {
  success: boolean
  tweet?: TweetData
  error?: string
} 