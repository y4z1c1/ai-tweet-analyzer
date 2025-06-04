export type Sentiment = 'positive' | 'negative' | 'neutral'

export interface AnalysisResult {
  summary: string
  sentiment: Sentiment
  confidence: number // 0-1 scale for sentiment confidence
}

export interface AnalysisApiResponse {
  success: boolean
  analysis?: AnalysisResult
  error?: string
} 