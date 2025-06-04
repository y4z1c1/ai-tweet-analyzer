export interface TweetData {
  html: string
  authorName: string
  authorUrl: string
  username: string
  url: string
  text: string
  width: number
  height: number
  profilePicture?: string
}

export interface TweetApiResponse {
  success: boolean
  tweet?: TweetData
  error?: string
} 