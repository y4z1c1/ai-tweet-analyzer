export type Sentiment = 'positive' | 'negative' | 'neutral'

export interface AnalysisResult {
  summary: string
  sentiment: Sentiment
}

export interface AnalysisApiResponse {
  success: boolean
  analysis?: AnalysisResult
  error?: string
} 