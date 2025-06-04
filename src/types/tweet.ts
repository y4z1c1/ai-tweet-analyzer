export interface TweetData {
  html: string
  authorName: string
  authorUrl: string
  url: string
  text: string
  width: number
  height: number
}

export interface TweetApiResponse {
  success: boolean
  tweet?: TweetData
  error?: string
} 